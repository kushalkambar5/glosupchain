import sys
import os
import requests

# Allow direct execution by adding the project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.config import get_db_connection, WEATHER_API_KEY

def get_city_from_coords(lat: float, lon: float):
    """
    Reverse geocodes lat/lon to a city name using Nominatim API.
    """
    url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}"
    headers = {"User-Agent": "SmartDynamicRouteSystem/1.0"}
    try:
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()
        address = data.get("address", {})
        city = address.get("city") or address.get("town") or address.get("village") or address.get("county")
        return city
    except Exception as e:
        print(f"Error reverse geocoding: {e}")
        return None

def get_latest_weather(lat: float, lon: float):
    """
    Fetches real-time weather from WeatherAPI using coordinates.
    """
    url = f"https://api.weatherapi.com/v1/current.json?key={WEATHER_API_KEY}&q={lat},{lon}"
    
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        current = data.get("current", {})
        location = data.get("location", {})
        
        return {
            "detected_city": location.get("name"),
            "temperature_c": current.get("temp_c"),
            "feels_like_c": current.get("feelslike_c"),
            "condition": current.get("condition", {}).get("text"),
            "wind_kph": current.get("wind_kph"),
            "humidity": current.get("humidity")
        }
    except Exception as e:
        print(f"Error fetching live weather: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    print(get_latest_weather(40.7128, -74.0060))