from sqlalchemy import Column, Integer, Float, Text, ForeignKey, DateTime
from db.base import Base
from datetime import datetime


class WeatherResult(Base):
    __tablename__ = "weather_results"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Optional links (keep nullable but NOT ideal for long term)
    weather_id = Column(Integer, ForeignKey("weather.id"), nullable=True)

    # Core LLM outputs
    ai_summary = Column(Text, nullable=False)
    consequence = Column(Text, nullable=False)

    # Geospatial (center + radius in km)
    radius_km = Column(Float, nullable=False)

    # Strongly recommended additions (don’t skip these)
    severity = Column(Integer, nullable=False)  # 1–5 scale
    confidence = Column(Float, nullable=False)  # 0–1

    # When was this analysis generated?
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
