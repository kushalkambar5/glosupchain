import os
import sys
import requests
from datetime import datetime
from sqlalchemy.orm import Session

# Add the parent directory to sys.path if run directly so core can be imported
if __name__ == "__main__":
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import settings
from models.weather import Weather


class WeatherService:
    def __init__(self):
        self.api_key = settings.WEATHER_API_KEY
        self.base_url = "https://api.weatherapi.com/v1/current.json"

    def get_weather(self, city: str):
        params = {
            "q": city,
            "key": self.api_key,
        }
        response = requests.get(self.base_url, params=params)
        return response.json()

    def store_weather(self, weather_data: dict, db: Session):
        # Parse the last_updated date
        last_updated = self.parse_date(weather_data["current"]["last_updated"])
        recorded_at = self.parse_date(weather_data["location"]["localtime"])

        weather_obj = Weather(
            location_name=weather_data["location"]["name"],
            country=weather_data["location"]["country"],
            latitude=weather_data["location"]["lat"],
            longitude=weather_data["location"]["lon"],
            recorded_at=recorded_at,
            temperature_c=weather_data["current"]["temp_c"],
            feels_like_c=weather_data["current"]["feelslike_c"],
            condition=weather_data["current"]["condition"]["text"],
            wind_kph=weather_data["current"]["wind_kph"],
            wind_degree=weather_data["current"]["wind_degree"],
            wind_direction=weather_data["current"]["wind_dir"],
            gust_kph=weather_data["current"]["gust_kph"],
            precipitation_mm=weather_data["current"]["precip_mm"],
            visibility_km=weather_data["current"]["vis_km"],
            humidity=weather_data["current"]["humidity"],
            pressure_mb=weather_data["current"]["pressure_mb"],
            wind_chill_c=weather_data["current"]["windchill_c"],
            created_at=last_updated,
            updated_at=last_updated,
        )
        db.add(weather_obj)
        db.commit()

    def parse_date(self, date_str):
        if not date_str:
            return None
        # Handle format: YYYY-MM-DD HH:MM
        try:
            return datetime.strptime(date_str, "%Y-%m-%d %H:%M")
        except ValueError:
            # Fallback to isoformat if needed
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))


# if __name__ == "__main__":
#     from db.session import SessionLocal, engine
#     from db.base import Base

#     # Ensure tables exist
#     Base.metadata.create_all(bind=engine)

#     db = SessionLocal()
#     try:
#         weather_service = WeatherService()
#         print("Fetching weather for Delhi...")
#         weather_data = weather_service.get_weather("Delhi")
        
#         # Check for error in response
#         if "error" in weather_data:
#             print(f"Error fetching weather: {weather_data['error'].get('message', 'Unknown error')}")
#         else:
#             print(f"Current temp in {weather_data['location']['name']}: {weather_data['current']['temp_c']}C")
#             weather_service.store_weather(weather_data, db)
#             print("Weather stored successfully")
#     except Exception as e:
#         db.rollback()
#         print(f"Error in weather service: {e}")
#     finally:
#         db.close()