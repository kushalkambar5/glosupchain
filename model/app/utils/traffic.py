import sys
import os
import requests

# Allow direct execution by adding the project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.config import TOMTOM_API_KEY

def get_traffic(lat, lon, api_key=TOMTOM_API_KEY):
    """
    Fetches real-time traffic data from TomTom API for given coordinates.
    """
    url = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"
    
    params = {
        "point": f"{lat},{lon}",
        "unit": "KMPH",
        "key": api_key
    }

    try:
        response = requests.get(url, params=params, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            
            # Extract useful info
            flow = data.get("flowSegmentData", {})
            
            result = {
                "current_speed": flow.get("currentSpeed"),
                "free_flow_speed": flow.get("freeFlowSpeed"),
                "confidence": flow.get("confidence"),
                "road_closure": flow.get("roadClosure"),
                "travel_time": flow.get("currentTravelTime"),
                "free_flow_travel_time": flow.get("freeFlowTravelTime")
            }
            
            return result
        else:
            return {"error": response.status_code, "message": response.text}
    
    except requests.exceptions.RequestException as e:
        return {"error": "Request Exception", "message": str(e)}

if __name__ == "__main__":
    # Example: Bangalore
    test_lat = 12.9716
    test_lon = 77.5946
    
    traffic = get_traffic(test_lat, test_lon)
    print("Traffic Data for Bangalore:")
    print(traffic)
