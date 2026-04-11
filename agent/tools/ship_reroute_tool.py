import os
import sys
import json
import asyncio

# Ensure the agent root is on the path when run directly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import math
from typing import TypedDict, Annotated, List, Dict
from pydantic import BaseModel
import websockets
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, START, END

from db.session import SessionLocal
from models.user import Users
from models.shipwaysResult import ShipwayResult
from models.weatherResult import WeatherResult
from models.weather import Weather
from models.shipReroutes import ShipReroute
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)

# --- CONFIG ---
AIS_API_KEY = os.getenv("AIS_API_KEY", "ff4c13e6a3bdcb8ce1c5de7227068f6ee299a3d5")

# --- STATE ---
class State(TypedDict):
    ship_data: Dict[str, Dict[int, dict]]  # user_id -> { mmsi_id: {details} }

# --- LLM SETUP ---
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite",
    api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.2
)

class RerouteOutput(BaseModel):
    suggestion: str
    best_route: List[List[float]] # Nested lists like [[lat1, lon1], [lat2, lon2]]

structured_llm = llm.with_structured_output(RerouteOutput)

# --- UTILS ---
def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0  # km
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

# --- GRAPH NODES ---

def fetch_user_ships(state: State):
    """
    Search all users owned_ships and save them in state.
    """
    print("[Node] Fetching owned ships from database...")
    db = SessionLocal()
    try:
        # Avoid direct JSON comparison in SQL as it's backend-dependent
        users = db.query(Users).all()
        
        ship_data = state.get("ship_data", {})
        
        for u in users:
            uid = str(u.id)
            if not u.owned_ships:
                continue
                
            if uid not in ship_data:
                ship_data[uid] = {}
                
            for ship_id in u.owned_ships:
                if isinstance(ship_id, int) or (isinstance(ship_id, str) and ship_id.isdigit()):
                    mmsi = int(ship_id)
                    ship_data[uid][mmsi] = {
                        "ship_name": "Unknown",
                        "curr_lat": None,
                        "curr_long": None,
                        "destination": "Unknown",
                        "affected_by_news": [],
                        "affected_by_weather": [],
                        "suggestion": "",
                        "best_route": []
                    }
        return {"ship_data": ship_data}
    finally:
        db.close()


async def fetch_ais_data(state: State):
    """
    Fetch curr_lat, curr_long, destination from the api call.
    Uses asyncio timeouts to gracefully finish.
    """
    ship_data = state["ship_data"]
    
    target_mmsis = []
    for uid, ships in ship_data.items():
        target_mmsis.extend(list(ships.keys()))
        
    if not target_mmsis:
        print("[Node] No target MMSIs to fetch AIS logic.")
        return {"ship_data": ship_data}

    print(f"[Node] Launching AIS Websocket for targets: {target_mmsis}")

    async def listen_to_ais():
        try:
            async with websockets.connect("wss://stream.aisstream.io/v0/stream") as ws:
                subscribe_message = {
                    "APIKey": AIS_API_KEY,
                    "BoundingBoxes": [[[-90, -180], [90, 180]]],
                    "FilterMessageTypes": ["PositionReport", "ShipStaticData"],
                }
                await ws.send(json.dumps(subscribe_message))
                
                # Continuously parse until timeout
                while True:
                    msg = await ws.recv()
                    data = json.loads(msg)
                    mmsi = data.get("MetaData", {}).get("MMSI")
                    
                    if mmsi not in target_mmsis:
                        continue
                        
                    msg_type = data.get("MessageType")
                    
                    # Update matched ship across all users who own it
                    for uid, ships in ship_data.items():
                        if mmsi in ships:
                            target = ships[mmsi]
                            if msg_type == "PositionReport":
                                pos = data["Message"]["PositionReport"]
                                target["curr_lat"] = pos.get("Latitude")
                                target["curr_long"] = pos.get("Longitude")
                            elif msg_type == "ShipStaticData":
                                stat = data["Message"]["ShipStaticData"]
                                target["destination"] = stat.get("Destination", "Unknown").strip()
                                target["ship_name"] = stat.get("Name", "Unknown").strip()
        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception as e:
            print(f"AIS stream error: {e}")

    # Listen aggressively for 30s then proceed downstream
    try:
        await asyncio.wait_for(listen_to_ais(), timeout=30.0)
    except asyncio.TimeoutError:
        print("[Node] Finished 30s AIS streaming window. Proceeding with fallbacks if needed.")
        
    # FALLBACK: If no position obtained, assign a mock one IN WATER for testing
    # Using a known maritime point (e.g., near the Cape of Good Hope or Suez)
    maritime_fallbacks = [
        (34.35,-18.47), # Cape of Good Hope
        (30.62, 32.35), # Near Suez
        (12.75, 45.01), # Gulf of Aden
        (1.23, 103.83)   # Singapore Strait
    ]
    import random
    for uid, ships in ship_data.items():
        for mmsi, target in ships.items():
            if target["curr_lat"] is None:
                lat, lon = random.choice(maritime_fallbacks)
                target["curr_lat"] = lat
                target["curr_long"] = lon
                print(f"[Fallback] Assigned mock MARITIME position to ship {mmsi}: ({target['curr_lat']}, {target['curr_long']})")

    return {"ship_data": ship_data}


def check_hazards(state: State):
    """
    Searches shipway_results and weather_results checking bounds.
    """
    print("[Node] Checking intersections against Hazards from the last 2 hours...")
    ship_data = state["ship_data"]
    db = SessionLocal()
    try:
        two_hours_ago = datetime.utcnow() - timedelta(hours=2)
        
        news_res = db.query(ShipwayResult).filter(ShipwayResult.created_at >= two_hours_ago).all()
        weather_res_raw = db.query(WeatherResult).filter(WeatherResult.created_at >= two_hours_ago).all()
        
        weather_res = []
        for wr in weather_res_raw:
            w = db.query(Weather).filter(Weather.id == wr.weather_id).first()
            if w and w.latitude and w.longitude:
                weather_res.append({
                    "id": wr.id,
                    "lat": w.latitude,
                    "long": w.longitude,
                    "radius": wr.radius_km
                })

        for uid, ships in ship_data.items():
            for mmsi, ship in ships.items():
                if ship["curr_lat"] is None or ship["curr_long"] is None:
                    continue
                
                clat, clong = ship["curr_lat"], ship["curr_long"]
                
                # News hazards check
                for nr in news_res:
                    if nr.center_lat is not None and nr.center_long is not None:
                        dist = haversine(clat, clong, nr.center_lat, nr.center_long)
                        if dist <= nr.radius_km:
                            ship["affected_by_news"].append(nr.id)
                            
                # Weather hazards check
                for wr in weather_res:
                    dist = haversine(clat, clong, wr["lat"], wr["long"])
                    if dist <= wr["radius"]:
                        ship["affected_by_weather"].append(wr["id"])
                        
        return {"ship_data": ship_data}
    finally:
        db.close()


async def generate_reroutes(state: State):
    """
    Send all data to LLM, obtain best routes and suggestions based on ai context.
    """
    print("[Node] Asking LLM for rerouting suggestions...")
    ship_data = state["ship_data"]
    db = SessionLocal()
    try:
        for uid, ships in ship_data.items():
            for mmsi, ship in ships.items():
                if ship["curr_lat"] is None or ship["curr_long"] is None:
                    continue
                    
                news_ids = ship["affected_by_news"]
                weather_ids = ship["affected_by_weather"]
                
                prompt = (
                    "You are a master maritime routing expert. Your task is to provide a SAFE and PRECISE navigation route "
                    "for a vessel that avoids all coastal landmasses and known hazardous zones. "
                    "The route MUST be entirely over navigable water (deep ocean or designated shipping lanes).\n\n"
                    f"Vessel: {ship['ship_name']} (MMSI: {mmsi})\n"
                    f"Current Coordinates: {ship['curr_lat']:.6f}, {ship['curr_long']:.6f}\n"
                    f"Destination Name: {ship['destination']}\n\n"
                )
                
                has_conflicts = bool(news_ids) or bool(weather_ids)
                
                if has_conflicts:
                    prompt += "CRITICAL WARNING: The current trajectory intersects hazardous zones:\n"
                    
                    for nid in news_ids:
                        nr = db.query(ShipwayResult).filter_by(id=nid).first()
                        if nr: prompt += f"- [News Alert] (Severity {nr.severity}/5): {nr.ai_summary}\n"
                        
                    for wid in weather_ids:
                        wr = db.query(WeatherResult).filter_by(id=wid).first()
                        if wr: prompt += f"- [Weather Alert] (Severity {wr.severity}/5): {wr.ai_summary}\n"
                    
                    prompt += (
                        "\nINSTRUCTIONS:\n"
                        "1. Suggest a reroute that stays at least 20 nautical miles from any coastline.\n"
                        "2. Provide EXACT coordinates (minimum 5 decimal places) for at least 3 waypoints defining this safe path.\n"
                        "3. Do NOT hallucinate inland routes; if the destination is a port, the final waypoint should be at the harbor entrance.\n"
                        "4. Your response MUST include the 'best_route' as a list of [lat, lon] lists and a clear 'suggestion' explanation."
                    )
                else:
                    prompt += (
                        "No active conflicts detected. Provide a standard high-precision maritime route "
                        "(at least 3 waypoints) leading towards the destination. Ensure all waypoints are in open water."
                    )
                    
                print(f"  -> Requesting LLM for ship {mmsi}...")
                try:
                    result: RerouteOutput = await structured_llm.ainvoke(prompt)
                    ship["best_route"] = result.best_route
                    ship["suggestion"] = result.suggestion
                except Exception as e:
                    print(f"Error formulating LLM route for MMSI {mmsi}: {e}")

        return {"ship_data": ship_data}
    finally:
        db.close()

def save_reroutes_db(state: State):
    """
    Save all processed states into the ship_reroutes database model.
    """
    print("[Node] Committing reroutes to DB...")
    ship_data = state["ship_data"]
    db = SessionLocal()
    try:
        count = 0
        for uid, ships in ship_data.items():
            for mmsi, ship in ships.items():
                if ship["curr_lat"] is None or not ship["suggestion"]:
                    continue
                    
                record = ShipReroute(
                    user_id=uid,
                    ship_id=mmsi,
                    affected_by_news=ship["affected_by_news"],
                    affected_by_weather=ship["affected_by_weather"],
                    best_route=ship["best_route"],
                    suggestion=ship["suggestion"]
                )
                db.add(record)
                count += 1
                
        db.commit()
        print(f"[Node] Complete. Saved {count} rerouing reports.")
        return state
    finally:
        db.close()


# --- BUILD GRAPH ---
workflow = StateGraph(State)

workflow.add_node("fetch_user_ships", fetch_user_ships)
workflow.add_node("fetch_ais_data", fetch_ais_data)
workflow.add_node("check_hazards", check_hazards)
workflow.add_node("generate_reroutes", generate_reroutes)
workflow.add_node("save_reroutes_db", save_reroutes_db)

workflow.add_edge(START, "fetch_user_ships")
workflow.add_edge("fetch_user_ships", "fetch_ais_data")
workflow.add_edge("fetch_ais_data", "check_hazards")
workflow.add_edge("check_hazards", "generate_reroutes")
workflow.add_edge("generate_reroutes", "save_reroutes_db")
workflow.add_edge("save_reroutes_db", END)

app = workflow.compile()

# Automatically executable standalone testing instance
if __name__ == "__main__":
    async def run_pipeline():
        print("Starting Rerouting Pipeline...")
        await app.ainvoke({"ship_data": {}})
    asyncio.run(run_pipeline())
