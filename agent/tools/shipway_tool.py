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
    news: Any
    supply_chain_news_ids: List[str]
    results: Dict[str, dict]
    keywords: List[str]

def fetch_daily_news_node(state: SupplyChainState):
    """
    Node that fetches daily news from the external API for all active keywords
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


def analyze_supply_chain_news_node(state: SupplyChainState):
    """
    Node that fetches daily news using the get_daily_news tool,
    sends it to the LLM to identify news that can affect the supply chain,
    and returns a list of their IDs along with the raw news.
    """
    try:
        news_data = get_daily_news_for_processing.invoke({})
    except Exception as e:
        news_data = str(e)
        return {"supply_chain_news_ids": [], "news": news_data}

    if not isinstance(news_data, list):
        news_data = [news_data] # fallback
        
    all_parsed_ids = []
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", 
         "You are an expert supply chain analyst. "
         "Analyze the provided daily news data. Identify which news articles might affect the supply chain. "
         "Extract their unique ID (such as 'id', 'article_id', or whatever identifier is present). "
         "Return ONLY a strictly valid JSON list of strings representing the IDs of the relevant news articles. "
         "Do not include any other text, explanations, or markdown formatting like ```json. "
         "If no articles are relevant, return []."),
        ("human", "News data:\n{news}")
    ])
    
    chain = prompt | llm | StrOutputParser()

    batch_size = 50
    total_batches = (len(news_data) + batch_size - 1) // batch_size
    for i in range(0, len(news_data), batch_size):
        batch_num = i // batch_size + 1
        batch = news_data[i:i+batch_size]
        print(f"[Analyze] Processing batch {batch_num}/{total_batches} ({len(batch)} articles)...")
        
        try:
            result = llm_invoke_with_backoff(chain, {"news": json.dumps(batch)})
            cleaned_result = result.strip()
            if cleaned_result.startswith("```json"):
                cleaned_result = cleaned_result[7:]
            if cleaned_result.startswith("```"):
                cleaned_result = cleaned_result[3:]
            if cleaned_result.endswith("```"):
                cleaned_result = cleaned_result[:-3]
            parsed_ids = json.loads(cleaned_result.strip())
            if isinstance(parsed_ids, list):
                all_parsed_ids.extend(parsed_ids)
        except Exception as e:
            print(f"Failed to process batch {batch_num}: {e}")
        
        # Brief pause between batches to avoid immediate rate limit on next call
        if i + batch_size < len(news_data):
            print("[Rate Limit] Pausing 5s before next batch...")
            time.sleep(5)

    # Remove duplicates just in case
    all_parsed_ids = list(set(all_parsed_ids))
        
    return {"supply_chain_news_ids": all_parsed_ids, "news": news_data}


def evaluate_news_impact_node(state: SupplyChainState):
    """
    Node that takes the relevant news IDs and raw news,
    requests structured information from Gemini,
    and saves the results to the state.
    """
    news_data = state.get("news", [])
    target_ids = state.get("supply_chain_news_ids", [])
    
    if not target_ids:
        return {"results": {}, "keywords": []}

    # Filter news data to only involve target_ids to save massive LLM tokens
    if isinstance(news_data, list):
        target_news = [n for n in news_data if isinstance(n, dict) and n.get("article_id") in target_ids]
    else:
        target_news = news_data
        
    prompt = ChatPromptTemplate.from_messages([
        ("system", 
         "You are a logistics and supply chain risk expert. "
         "I will provide you with daily news, and a specific list of relevant news IDs. "
         "First, for *each* of those relevant news IDs, extract or estimate the following parameters: "
         "1. ai_summary (string) "
         "2. consequence (string) "
         "3. center_lat (float) - latitude of center of the area on Earth which may be affected by the news "
         "4. center_long (float) - longitude of center of the area on Earth which may be affected by the news "
         "5. radius_km (float) - radius in km of the area on Earth which may be affected by the news "
         "6. severity (string - low, medium, high, critical) "
         "7. confidence (float - between 0 and 1) "
         "\n\n"
         "Second, generate a list of exactly 5 related keywords overall based on the severity and topics of these relevant news articles. "
         "\n\n"
         "Return ONLY a strictly valid JSON object with exactly two keys: 'results' and 'keywords'. "
         "The 'results' key should be an object where keys are the news IDs and values are objects containing the parameters above. "
         "The 'keywords' key should be a list of 5 string keywords. "
         "Do not include markdown formatting like ```json or any other text, just the raw JSON object."),
        ("human", "Target News IDs: {ids}\n\nNews Data: {news}")
    ])
    
    chain = prompt | llm | StrOutputParser()
    
    all_results = {}
    all_keywords = []

    batch_size = 50
    severity_map = {"low": 1, "medium": 2, "high": 3, "critical": 4}
    total_batches = (len(target_ids) + batch_size - 1) // batch_size

    for i in range(0, len(target_ids), batch_size):
        batch_num = i // batch_size + 1
        batch_ids = target_ids[i:i+batch_size]
        print(f"[Evaluate] Processing batch {batch_num}/{total_batches} ({len(batch_ids)} articles)...")
        
        # Pull only the exact matched news objects for this sub-batch
        if isinstance(target_news, list):
            batch_news = [n for n in target_news if n.get("article_id") in batch_ids]
        else:
            batch_news = target_news
        
        batch_results = {}
        batch_keywords = []
        try:
            result = llm_invoke_with_backoff(chain, {"news": json.dumps(batch_news), "ids": json.dumps(batch_ids)})
            cleaned_result = result.strip()
            if cleaned_result.startswith("```json"):
                cleaned_result = cleaned_result[7:]
            if cleaned_result.startswith("```"):
                cleaned_result = cleaned_result[3:]
            if cleaned_result.endswith("```"):
                cleaned_result = cleaned_result[:-3]
            parsed_json = json.loads(cleaned_result.strip())
            
            if "results" in parsed_json and isinstance(parsed_json["results"], dict):
                batch_results = parsed_json["results"]
                all_results.update(batch_results)
            if "keywords" in parsed_json and isinstance(parsed_json["keywords"], list):
                batch_keywords = parsed_json["keywords"]
                all_keywords.extend(batch_keywords)
        except Exception as e:
            print(f"Failed to parse LLM detailed results for batch {batch_num}: {e}")

        # --- Save this batch to DB immediately before the next LLM call ---
        if batch_results:
            print(f"[Evaluate] Saving batch {batch_num} results to DB...")
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
                    existing_res = db.query(ShipwayResult).filter(ShipwayResult.news_id == news_item.id).first()
                    if not existing_res:
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
                db.commit()
                print(f"[Evaluate] Batch {batch_num} saved successfully.")
            except Exception as e:
                db.rollback()
                print(f"[Evaluate] DB save failed for batch {batch_num}: {e}")
            finally:
                db.close()

        # Brief pause between batches to help with rate limits
        if i + batch_size < len(target_ids):
            print("[Rate Limit] Pausing 5s before next batch...")
            time.sleep(5)
            
    # Guarantee unique keywords
    all_keywords = list(set(all_keywords))
        
    return {
        "results": all_results, 
        "keywords": all_keywords
    }


def save_analysis_results_node(state: SupplyChainState):
    """
    Node that saves the analyzed results and extracted keywords 
    into their respective database models.
    """
    db = SessionLocal()
    try:
        # Save overarching keywords
        for word in state.get("keywords", []):
            if not word: continue
            word_str = str(word).strip()
            # Check if keyword already exists
            existing_kw = db.query(Keyword).filter(Keyword.word == word_str).first()
            if not existing_kw:
                new_kw = Keyword(word=word_str)
                db.add(new_kw)
        
        # Save detailed results into ShipwayResult
        results = state.get("results", {})
        for article_id, res in results.items():
            if not isinstance(res, dict): continue
            
            # Find the internal primary key news_id using the article_id string
            news_item = db.query(News).filter(News.article_id == article_id).first()
            if not news_item:
                continue  # Skip if we cannot tie it to a news record
                
            severity_map = {"low": 1, "medium": 2, "high": 3, "critical": 4}
            sev_str = str(res.get("severity", "low")).lower().strip()
            sev_val = severity_map.get(sev_str, 1)

            existing_res = db.query(ShipwayResult).filter(ShipwayResult.news_id == news_item.id).first()
            if not existing_res:
                shipway_result = ShipwayResult(
                    news_id=news_item.id,
                    ai_summary=str(res.get("ai_summary", "")),
                    consequence=str(res.get("consequence", "")),
                    center_lat=float(res.get("center_lat", 0.0) or 0.0),
                    center_long=float(res.get("center_long", 0.0) or 0.0),
                    radius_km=float(res.get("radius_km", 0.0) or 0.0),
                    severity=sev_val,
                    confidence=float(res.get("confidence", 0.0) or 0.0)
                )
                db.add(shipway_result)
        
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error saving to database: {e}")
    finally:
        db.close()
        
    return state


# --- Build StateGraph ---
workflow = StateGraph(SupplyChainState)

workflow.add_node("fetch_daily_news", fetch_daily_news_node)
workflow.add_node("analyze_news", analyze_supply_chain_news_node)
workflow.add_node("evaluate_news", evaluate_news_impact_node)
workflow.add_node("save_results", save_analysis_results_node)

workflow.add_edge(START, "fetch_daily_news")
workflow.add_edge("fetch_daily_news", "analyze_news")
workflow.add_edge("analyze_news", "evaluate_news")
workflow.add_edge("evaluate_news", "save_results")
workflow.add_edge("save_results", END)

# Compile into an executable app
app = workflow.compile()

if __name__ == "__main__":
    print("Starting Shipway News Analysis Pipeline...")
    initial_state = {
        "news": None,
        "supply_chain_news_ids": [],
        "results": {},
        "keywords": []
    }
    app.invoke(initial_state)
    print("Finished Shipway Pipeline.")

