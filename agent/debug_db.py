from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.user import Users
from models.shipwaysResult import ShipwayResult
from models.weatherResult import WeatherResult
from core.config import settings
from datetime import datetime, timedelta

# Create an engine WITHOUT echo
engine = create_engine(settings.DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    print("--- DEBUG DB START ---")
    users = db.query(Users).all()
    print(f"Total Users: {len(users)}")
    for u in users:
        print(f"User {u.id} ({u.email}) - Owned Ships: {u.owned_ships}")

    # Check for recent hazards
    two_hours_ago = datetime.utcnow() - timedelta(hours=30)
    news_count = db.query(ShipwayResult).filter(ShipwayResult.created_at >= two_hours_ago).count()
    weather_count = db.query(WeatherResult).filter(WeatherResult.created_at >= two_hours_ago).count()
    print(f"Recent News Hazards (30h): {news_count}")
    print(f"Recent Weather Hazards (30h): {weather_count}")
    print("--- DEBUG DB END ---")
finally:
    db.close()
