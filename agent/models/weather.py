from sqlalchemy import Column, Integer, Float, String, DateTime
from db.base import Base
from datetime import datetime


class Weather(Base):
    __tablename__ = "weather"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Location (denormalized for speed)
    location_name = Column(String(100), nullable=False)
    country = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    # Timestamp
    recorded_at = Column(DateTime, nullable=False)

    # Core weather
    temperature_c = Column(Float, nullable=False)
    feels_like_c = Column(Float)
    condition = Column(String(100))  # e.g. Rain, Snow, Clear

    # Wind
    wind_kph = Column(Float)
    wind_degree = Column(Integer)
    wind_direction = Column(String(10))
    gust_kph = Column(Float)

    # Rain / Snow
    precipitation_mm = Column(Float)

    # Visibility
    visibility_km = Column(Float)

    # Atmosphere
    humidity = Column(Integer)
    pressure_mb = Column(Float)
    wind_chill_c = Column(Float)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)