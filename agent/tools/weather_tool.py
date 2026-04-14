import os
import sys
import json

# Ensure the agent root is on the path when run directly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import langchain
from langchain.tools import tool
from services.weather_service import WeatherService
from db.session import SessionLocal
from models.location import PriorityType
import langgraph
from langgraph.graph import StateGraph, START, END
from typing import TypedDict, Dict, Any, List
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langgraph.prebuilt import ToolNode
from dotenv import load_dotenv

from models.weatherResult import WeatherResult

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
                raise
    raise RuntimeError(f"LLM call failed after {max_retries} retries due to rate limiting.")


@tool
def get_daily_weather():
    """Get daily weather"""
    db = SessionLocal()
    try:
        return WeatherService().get_daily_weather(db)
    finally:
        db.close()

@tool
def get_recent_weather():
    """Get recent weather"""
    db = SessionLocal()
    try:
        return WeatherService().get_recent_weather(db)
    finally:
        db.close()

@tool
def fetch_weather(location: str):
    """Fetch weather based on location"""
    return WeatherService().fetch_weather(location)

@tool
def fetch_and_store_daily_weather():
    """Fetch and store daily weather"""
    db = SessionLocal()
    try:
        WeatherService().fetch_and_store_daily_weather(db)
        return "Daily weather fetched and stored successfully."
    finally:
        db.close()

@tool
def fetch_and_store_oneday_weather():
    """Fetch and store one day weather"""
    db = SessionLocal()
    try:
        WeatherService().fetch_and_store_oneday_weather(db)
        return "One day weather fetched and stored successfully."
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
def get_daily_weather_for_processing():
    """Get daily weather for processing"""
    db = SessionLocal()
    try:
        return WeatherService().get_daily_weather_for_processing(db)
    finally:
        db.close()

@tool
def fetch_and_store_daily_weather_of_all_locations():
    """Fetch and store daily weather of all locations"""
    db = SessionLocal()
    try:
        WeatherService().fetch_and_store_daily_weather_of_all_locations(db)
        return "Daily weather fetched and stored successfully."
    finally:
        db.close()


tools = [
    get_daily_weather, get_recent_weather, fetch_weather, 
    fetch_and_store_daily_weather, fetch_and_store_oneday_weather, 
    get_latest_weather_by_priority, fetch_and_store_weather_by_priority, 
    get_daily_weather_for_processing, fetch_and_store_daily_weather_of_all_locations
]
tool_node = ToolNode(tools)


llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite",
    temperature=0.7,
    google_api_key=os.environ["GOOGLE_API_KEY"],
)

llm_with_tools = llm.bind_tools(tools)


class WeatherState(TypedDict):
    results: Dict[str, dict]


def fetch_daily_weather_node(state: WeatherState):
    """
    1st Node: fetches and stores weather data in db using fetch_and_store_daily_weather_of_all_locations()
    """
    db = SessionLocal()
    try:
        service = WeatherService()
        service.fetch_and_store_daily_weather_of_all_locations(db)
        print("Successfully fetched daily weather for all locations.")
    except Exception as e:
        print(f"Error fetching daily weather: {e}")
    finally:
        db.close()
    
    return state


def evaluate_and_save_weather_impact_node(state: WeatherState):
    """
    2nd Node: takes all data and sends to llm(in group of 50 locations) to check which may be impactful 
    for supply chain and if any weather conditions are impactful then create results for them 
    and save them in the WeatherResults model db.
    """
    try:
        weather_data = get_daily_weather_for_processing.invoke({})
    except Exception as e:
        weather_data = []

    if not isinstance(weather_data, list):
        weather_data = [weather_data] if weather_data else []

    all_results = {}

    if not weather_data:
        return {"results": all_results}

    prompt = ChatPromptTemplate.from_messages([
        ("system", 
         "You are a logistics and supply chain risk expert. "
         "I will provide you with daily weather data for various locations. "
         "Analyze each weather condition and determine if it might negatively impact the supply chain. "
         "If a weather condition is impactful, extract or estimate the following parameters: "
         "1. ai_summary (string) "
         "2. consequence (string) "
         "3. radius (float) - literal meaning: in how area this weather condition can affect (radius in km) "
         "4. severity (string - low, medium, high, critical) "
         "5. confidence (float - between 0 and 1)\n\n"
         "Return ONLY a strictly valid JSON object with a single key 'results'. "
         "The 'results' key should be an object where the keys are the EXACT weather IDs from the input "
         "(such as 'id' or 'weather_id'), and values are the extracted parameters above. "
         "Only include weather IDs that ARE impactful. "
         "Do not include markdown formatting like ```json or any other text, just the raw JSON object."),
        ("human", "Weather Data:\n{weather}")
    ])
    
    chain = prompt | llm | StrOutputParser()
    
    batch_size = 50
    severity_map = {"low": 1, "medium": 2, "high": 3, "critical": 4}
    total_batches = (len(weather_data) + batch_size - 1) // batch_size

    for i in range(0, len(weather_data), batch_size):
        batch_num = i // batch_size + 1
        batch = weather_data[i:i+batch_size]
        print(f"[Evaluate] Processing batch {batch_num}/{total_batches} ({len(batch)} locations)...")

        batch_results = {}
        try:
            result = llm_invoke_with_backoff(chain, {"weather": json.dumps(batch)})
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
        except Exception as e:
            print(f"[Evaluate] Failed to process batch {batch_num}: {e}")

        # --- Save this batch to DB immediately before the next LLM call ---
        if batch_results:
            print(f"[Evaluate] Saving batch {batch_num} results to DB...")
            db = SessionLocal()
            try:
                for weather_id_str, res in batch_results.items():
                    if not isinstance(res, dict):
                        continue
                    try:
                        w_id = int(weather_id_str)
                    except (ValueError, TypeError):
                        continue
                    sev_str = str(res.get("severity", "low")).lower().strip()
                    sev_val = severity_map.get(sev_str, 1)
                    existing_res = db.query(WeatherResult).filter(WeatherResult.weather_id == w_id).first()
                    if not existing_res:
                        db.add(WeatherResult(
                            weather_id=w_id,
                            ai_summary=str(res.get("ai_summary", "")),
                            consequence=str(res.get("consequence", "")),
                            radius_km=float(res.get("radius", 0.0) or res.get("radius_km", 0.0) or 0.0),
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

        # Brief pause between batches to stay under Gemini free tier 15 RPM limit
        if i + batch_size < len(weather_data):
            print("[Rate Limit] Pausing 15s before next batch...")
            time.sleep(15)

    return {"results": all_results}


# --- Build StateGraph ---
workflow = StateGraph(WeatherState)

workflow.add_node("fetch_weather", fetch_daily_weather_node)
workflow.add_node("evaluate_and_save", evaluate_and_save_weather_impact_node)

workflow.add_edge(START, "fetch_weather")
workflow.add_edge("fetch_weather", "evaluate_and_save")
workflow.add_edge("evaluate_and_save", END)

app = workflow.compile()

if __name__ == "__main__":
    print("Starting Weather Analysis Pipeline...")
    initial_state = {
        "results": {}
    }
    app.invoke(initial_state)
    print("Finished Weather Pipeline.")

