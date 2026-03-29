import json
import langchain
from langchain.tools import tool
from services.shipway_service import ShipwayService
import langgraph
from langgraph.graph import StateGraph, START, END
from models.location import PriorityType
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langgraph.prebuilt import ToolNode

from db.session import SessionLocal
from models.keyword import Keyword
from models.shipwaysResult import ShipwayResult
from models.news import News

if "GOOGLE_API_KEY" not in os.environ:
    raise ValueError("GOOGLE_API_KEY environment variable not set.")

@tool
def get_daily_news():
    """Get daily news"""
    shipway_service = ShipwayService()
    return shipway_service.get_daily_news()

@tool
def get_recent_news():
    """Get recent news"""
    shipway_service = ShipwayService()
    return shipway_service.get_recent_news()

@tool
def fetch_news(keyword: str):
    """Fetch news based on keyword which may impact supply chain (e.g. port, weather, strike, any city name, country name etc.)"""
    shipway_service = ShipwayService()
    return shipway_service.fetch_news(keyword)

@tool
def fetch_and_store_daily_news():
    """Fetch and store daily news"""
    shipway_service = ShipwayService()
    return shipway_service.fetch_and_store_daily_news()

@tool
def fetch_and_store_oneday_news():
    """Fetch and store one day news"""
    shipway_service = ShipwayService()
    return shipway_service.fetch_and_store_oneday_news()

@tool
def get_latest_weather_by_priority(priority: PriorityType):
    """Get latest weather by priority"""
    shipway_service = ShipwayService()
    return shipway_service.get_latest_weather_by_priority(priority)

@tool
def fetch_and_store_weather_by_priority(priority: PriorityType):
    """Fetch and store weather by priority"""
    shipway_service = ShipwayService()
    return shipway_service.fetch_and_store_weather_by_priority(priority)

@tool
def get_daily_news_for_processing():
    """Get daily news for processing"""
    shipway_service = ShipwayService()
    return shipway_service.get_daily_news_for_processing()

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

def analyze_supply_chain_news_node(state: SupplyChainState):
    """
    Node that fetches daily news using the get_daily_news tool,
    sends it to the LLM to identify news that can affect the supply chain,
    and returns a list of their IDs along with the raw news.
    """
    # Fetch daily news using the tool
    try:
        news_data = get_daily_news_for_processing.invoke({})
    except Exception as e:
        news_data = str(e)
        
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
    result = chain.invoke({"news": str(news_data)})
    
    # Parse the JSON response
    parsed_ids = []
    try:
        cleaned_result = result.strip()
        if cleaned_result.startswith("```json"):
            cleaned_result = cleaned_result[7:]
        if cleaned_result.startswith("```"):
            cleaned_result = cleaned_result[3:]
        if cleaned_result.endswith("```"):
            cleaned_result = cleaned_result[:-3]
        parsed_ids = json.loads(cleaned_result.strip())
    except Exception as e:
        print(f"Failed to parse LLM response into JSON: {e}\nResponse was: {result}")
        parsed_ids = []
        
    return {"supply_chain_news_ids": parsed_ids, "news": news_data}


def evaluate_news_impact_node(state: SupplyChainState):
    """
    Node that takes the relevant news IDs and raw news,
    requests structured information from Gemini,
    and saves the results to the state.
    """
    news_data = state.get("news", "")
    target_ids = state.get("supply_chain_news_ids", [])
    
    if not target_ids:
        return {"results": {}, "keywords": []}
        
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
    result = chain.invoke({"news": str(news_data), "ids": json.dumps(target_ids)})
    
    parsed_json = {}
    try:
        cleaned_result = result.strip()
        if cleaned_result.startswith("```json"):
            cleaned_result = cleaned_result[7:]
        if cleaned_result.startswith("```"):
            cleaned_result = cleaned_result[3:]
        if cleaned_result.endswith("```"):
            cleaned_result = cleaned_result[:-3]
        parsed_json = json.loads(cleaned_result.strip())
    except Exception as e:
        print(f"Failed to parse LLM detailed results into JSON: {e}\nResponse was: {result}")
        parsed_json = {"results": {}, "keywords": []}
        
    return {
        "results": parsed_json.get("results", {}), 
        "keywords": parsed_json.get("keywords", [])
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

workflow.add_node("analyze_news", analyze_supply_chain_news_node)
workflow.add_node("evaluate_news", evaluate_news_impact_node)
workflow.add_node("save_results", save_analysis_results_node)

workflow.add_edge(START, "analyze_news")
workflow.add_edge("analyze_news", "evaluate_news")
workflow.add_edge("evaluate_news", "save_results")
workflow.add_edge("save_results", END)

# Compile into an executable app
app = workflow.compile()

