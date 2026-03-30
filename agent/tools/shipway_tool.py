import json
import sys
import os

# Ensure the agent root is on the path when run directly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import langchain
from langchain.tools import tool
from services.news_service import NewsService
from services.weather_service import WeatherService
import langgraph
from langgraph.graph import StateGraph, START, END
from models.location import PriorityType
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langgraph.prebuilt import ToolNode
from dotenv import load_dotenv

from db.session import SessionLocal
from models.keyword import Keyword
from models.shipwaysResult import ShipwayResult
from models.news import News

import time

load_dotenv()

if "GOOGLE_API_KEY" not in os.environ:
    raise ValueError("GOOGLE_API_KEY environment variable not set.")

def llm_invoke_with_backoff(chain, inputs, max_retries=5):
    """Invoke a LangChain chain with exponential backoff on 429/503 errors."""
    delay = 10  # Start at 10s
    for attempt in range(max_retries):
        try:
            return chain.invoke(inputs)
        except Exception as e:
            err = str(e).lower()
            if "429" in err or "too many requests" in err or "503" in err or "service unavailable" in err:
                print(f"[Rate Limit] {type(e).__name__}. Waiting {delay}s before retry {attempt+1}/{max_retries}...")
                time.sleep(delay)
                delay *= 2  # Exponential backoff: 10, 20, 40, 80, 160s
            else:
                raise  # Re-raise non-rate-limit errors immediately
    raise RuntimeError(f"LLM call failed after {max_retries} retries due to rate limiting.")

@tool
def get_daily_news():
    """Get daily news"""
    db = SessionLocal()
    try:
        return NewsService().get_daily_news(db)
    finally:
        db.close()

@tool
def get_recent_news():
    """Get recent news"""
    db = SessionLocal()
    try:
        return NewsService().get_recent_news(db)
    finally:
        db.close()

@tool
def fetch_news(keyword: str):
    """Fetch news based on keyword which may impact supply chain (e.g. port, weather, strike, any city name, country name etc.)"""
    return NewsService().fetch_news(keyword)

@tool
def fetch_and_store_daily_news():
    """Fetch and store daily news"""
    db = SessionLocal()
    try:
        NewsService().fetch_and_store_daily_news(db)
        return "Daily news fetched and stored successfully."
    finally:
        db.close()

@tool
def fetch_and_store_oneday_news():
    """Fetch and store one day news"""
    db = SessionLocal()
    try:
        NewsService().fetch_and_store_oneday_news(db)
        return "One day news fetched and stored successfully."
    finally:
        db.close()

@tool
def get_latest_weather_by_priority(priority: PriorityType):
    """Get latest weather by priority"""
    db = SessionLocal()
    try:
        return WeatherService().get_latest_weather_by_priority(db, priority)
    finally:
        db.close()

@tool
def fetch_and_store_weather_by_priority(priority: PriorityType):
    """Fetch and store weather by priority"""
    db = SessionLocal()
    try:
        WeatherService().fetch_and_store_weather_by_priority(db, priority)
        return "Weather fetched and stored successfully."
    finally:
        db.close()

@tool
def get_daily_news_for_processing():
    """Get daily news for processing"""
    db = SessionLocal()
    try:
        return NewsService().get_daily_news_for_processing(db)
    finally:
        db.close()

tools = [get_daily_news, get_recent_news, fetch_news, fetch_and_store_daily_news, fetch_and_store_oneday_news, get_latest_weather_by_priority, fetch_and_store_weather_by_priority, get_daily_news_for_processing]
tool_node = ToolNode(tools)




llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite",
    temperature=0.7,
    google_api_key=os.environ["GOOGLE_API_KEY"],
)

llm_with_tools = llm.bind_tools(tools)

from typing import TypedDict, Dict, Any, List

class SupplyChainState(TypedDict):
    results: Dict[str, dict]
    keywords: List[str]

def fetch_daily_news_node(state: SupplyChainState):
    """
    Node 1: Fetches daily news from the external API for all active keywords
    and stores them in the database before analysis begins.
    """
    db = SessionLocal()
    try:
        service = NewsService()
        service.fetch_and_store_daily_news_of_all_keywords(db)
        print("Successfully fetched daily news from API for all keywords.")
    except Exception as e:
        print(f"Error fetching daily news from API: {e}")
    finally:
        db.close()
    return state


def analyze_and_save_node(state: SupplyChainState):
    """
    Node 2: Fetches all news, sends them to the LLM in batches of 50.
    Each batch call does BOTH filtering AND full analysis in one shot.
    Results are saved to DB immediately after each batch.
    """
    try:
        news_data = get_daily_news_for_processing.invoke({})
    except Exception as e:
        print(f"Error fetching news for processing: {e}")
        return {"results": {}, "keywords": []}

    if not isinstance(news_data, list):
        news_data = [news_data] if news_data else []

    if not news_data:
        print("No news data to process.")
        return {"results": {}, "keywords": []}

    prompt = ChatPromptTemplate.from_messages([
        ("system",
         "You are a logistics and supply chain risk expert.\n\n"
         "Given a batch of news articles, do the following in ONE response:\n"
         "1. Identify ONLY the articles that could negatively affect the supply chain "
         "(e.g. port strikes, severe weather events, geopolitical instability, trade disruptions).\n"
         "2. For each relevant article, extract or estimate:\n"
         "   - ai_summary (string): brief summary of the supply chain risk\n"
         "   - consequence (string): what could happen to supply chains\n"
         "   - center_lat (float): latitude of the most affected area\n"
         "   - center_long (float): longitude of the most affected area\n"
         "   - radius_km (float): estimated radius of impact in km\n"
         "   - severity (string): one of low, medium, high, critical\n"
         "   - confidence (float): your confidence between 0 and 1\n"
         "3. Generate up to 5 related supply chain keywords from the relevant articles.\n\n"
         "Return ONLY a strictly valid JSON object with exactly two keys:\n"
         "  'results': object where keys are article_id strings and values are the parameters above "
         "(include ONLY supply-chain-relevant articles, skip irrelevant ones entirely)\n"
         "  'keywords': list of up to 5 keyword strings\n\n"
         "No markdown, no extra text. Just the raw JSON object."),
        ("human", "News articles:\n{news}")
    ])

    chain = prompt | llm | StrOutputParser()
    severity_map = {"low": 1, "medium": 2, "high": 3, "critical": 4}

    all_results = {}
    all_keywords = []
    batch_size = 50
    total_batches = (len(news_data) + batch_size - 1) // batch_size

    for i in range(0, len(news_data), batch_size):
        batch_num = i // batch_size + 1
        batch = news_data[i:i + batch_size]
        print(f"[Batch {batch_num}/{total_batches}] Analyzing {len(batch)} articles...")

        batch_results = {}
        batch_keywords = []
        try:
            result = llm_invoke_with_backoff(chain, {"news": json.dumps(batch)})
            cleaned = result.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            parsed = json.loads(cleaned.strip())

            if "results" in parsed and isinstance(parsed["results"], dict):
                batch_results = parsed["results"]
                all_results.update(batch_results)
            if "keywords" in parsed and isinstance(parsed["keywords"], list):
                batch_keywords = parsed["keywords"]
                all_keywords.extend(batch_keywords)

        except Exception as e:
            print(f"[Batch {batch_num}] Failed: {e}")

        # Save this batch to DB immediately
        if batch_results:
            print(f"[Batch {batch_num}] Saving {len(batch_results)} results to DB...")
            db = SessionLocal()
            try:
                for article_id, res in batch_results.items():
                    if not isinstance(res, dict):
                        continue
                    news_item = db.query(News).filter(News.article_id == article_id).first()
                    if not news_item:
                        continue
                    sev_str = str(res.get("severity", "low")).lower().strip()
                    sev_val = severity_map.get(sev_str, 1)
                    existing = db.query(ShipwayResult).filter(ShipwayResult.news_id == news_item.id).first()
                    if not existing:
                        db.add(ShipwayResult(
                            news_id=news_item.id,
                            ai_summary=str(res.get("ai_summary", "")),
                            consequence=str(res.get("consequence", "")),
                            center_lat=float(res.get("center_lat", 0.0) or 0.0),
                            center_long=float(res.get("center_long", 0.0) or 0.0),
                            radius_km=float(res.get("radius_km", 0.0) or 0.0),
                            severity=sev_val,
                            confidence=float(res.get("confidence", 0.0) or 0.0)
                        ))
                # Also save keywords from this batch
                for word in batch_keywords:
                    if not word:
                        continue
                    word_str = str(word).strip()
                    existing_kw = db.query(Keyword).filter(Keyword.word == word_str).first()
                    if not existing_kw:
                        db.add(Keyword(word=word_str))
                db.commit()
                print(f"[Batch {batch_num}] Saved successfully.")
            except Exception as e:
                db.rollback()
                print(f"[Batch {batch_num}] DB save failed: {e}")
            finally:
                db.close()

        # Pause between batches to stay under Gemini free tier 15 RPM limit
        if i + batch_size < len(news_data):
            print("[Rate Limit] Pausing 15s before next batch...")
            time.sleep(15)

    all_keywords = list(set(all_keywords))
    print(f"Pipeline complete. {len(all_results)} articles saved, {len(all_keywords)} keywords collected.")
    return {"results": all_results, "keywords": all_keywords}


# --- Build StateGraph ---
workflow = StateGraph(SupplyChainState)

workflow.add_node("fetch_daily_news", fetch_daily_news_node)
workflow.add_node("analyze_and_save", analyze_and_save_node)

workflow.add_edge(START, "fetch_daily_news")
workflow.add_edge("fetch_daily_news", "analyze_and_save")
workflow.add_edge("analyze_and_save", END)

# Compile into an executable app
app = workflow.compile()

if __name__ == "__main__":
    print("Starting Shipway News Analysis Pipeline...")
    initial_state = {
        "results": {},
        "keywords": []
    }
    app.invoke(initial_state)
    print("Finished Shipway Pipeline.")
