import os
import json
import asyncio
import math
from typing import TypedDict, Annotated, List, Dict
from pydantic import BaseModel
import websockets
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, START, END

from db.session import get_db
from models.user import User
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
    db = next(get_db())
    users = db.query(User).filter(User.owned_ships != []).all()
    
    ship_data = state.get("ship_data", {})
    
    for u in users:
        uid = str(u.id)
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

    # Listen aggressively for 2 minutes then proceed downstream
    try:
        await asyncio.wait_for(listen_to_ais(), timeout=120.0)
    except asyncio.TimeoutError:
        print("[Node] Finished 120s AIS streaming window. Proceeding.")
        
    return {"ship_data": ship_data}


def check_hazards(state: State):
    """
    Searches shipway_results and weather_results checking bounds.
    """
    print("[Node] Checking intersections against Hazards from the last 2 hours...")
    ship_data = state["ship_data"]
    db = next(get_db())
    
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


async def generate_reroutes(state: State):
    """
    Send all data to LLM, obtain best routes and suggestions based on ai context.
    """
    print("[Node] Asking LLM for rerouting suggestions...")
    ship_data = state["ship_data"]
    db = next(get_db())

    for uid, ships in ship_data.items():
        for mmsi, ship in ships.items():
            if ship["curr_lat"] is None or ship["curr_long"] is None:
                continue
                
            news_ids = ship["affected_by_news"]
            weather_ids = ship["affected_by_weather"]
            
            prompt = f"Analyze optimal navigation routing for the following vessel:\n"
            prompt += f"Ship Name: {ship['ship_name']} (MMSI: {mmsi})\n"
            prompt += f"Current Location: Latitude {ship['curr_lat']}, Longitude {ship['curr_long']}\n"
            prompt += f"Destination: {ship['destination']}\n\n"
            
            has_conflicts = bool(news_ids) or bool(weather_ids)
            
            if has_conflicts:
                prompt += "WARNING: This ship intersects the following hazardous zones:\n"
                
                for nid in news_ids:
                    nr = db.query(ShipwayResult).filter_by(id=nid).first()
                    if nr: prompt += f"- [News Alert] (Severity {nr.severity}/5): {nr.ai_summary} | Consequence: {nr.consequence}\n"
                    
                for wid in weather_ids:
                    wr = db.query(WeatherResult).filter_by(id=wid).first()
                    if wr: prompt += f"- [Weather Alert] (Severity {wr.severity}/5): {wr.ai_summary} | Consequence: {wr.consequence}\n"
                
                prompt += "\nBased on this, suggest a safe avoidance route and an explanation."
            else:
                prompt += "No active conflicts detected. Provide a general route and confirming suggestion."
                
            print(f"  -> Requesting LLM for ship {mmsi}...")
            try:
                result: RerouteOutput = await structured_llm.ainvoke(prompt)
                ship["best_route"] = result.best_route
                ship["suggestion"] = result.suggestion
            except Exception as e:
                print(f"Error formulating LLM route for MMSI {mmsi}: {e}")

    return {"ship_data": ship_data}

def save_reroutes_db(state: State):
    """
    Save all processed states into the ship_reroutes database model.
    """
    print("[Node] Committing reroutes to DB...")
    ship_data = state["ship_data"]
    db = next(get_db())
    
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
