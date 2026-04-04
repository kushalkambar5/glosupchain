from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.shipwaysResult import ShipwayResult
from models.weatherResult import WeatherResult
from models.weather import Weather
from core.config import settings
from datetime import datetime, timedelta

engine = create_engine(settings.DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    print("--- HAZARD LOCATIONS ---")
    two_hours_ago = datetime.utcnow() - timedelta(hours=30)
    
    # News Hazards
    news = db.query(ShipwayResult).filter(ShipwayResult.created_at >= two_hours_ago).all()
    for n in news:
        if n.center_lat is not None:
             print(f"News Alert {n.id}: Lat {n.center_lat}, Long {n.center_long}, Radius {n.radius_km}km")

    # Weather Hazards
    weather_res_raw = db.query(WeatherResult).filter(WeatherResult.created_at >= two_hours_ago).all()
    for wr in weather_res_raw:
        w = db.query(Weather).filter(Weather.id == wr.weather_id).first()
        if w and w.latitude:
            print(f"Weather Alert {wr.id}: Lat {w.latitude}, Long {w.longitude}, Radius {wr.radius_km}km")
    print("--- END HAZARDS ---")
finally:
    db.close()
