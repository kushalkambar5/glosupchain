from sqlalchemy import Column, Integer, Float, Text, ForeignKey, DateTime, BigInteger
from db.base import Base
from datetime import datetime


class ShipwayResult(Base):
    __tablename__ = "shipway_results"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Optional links (keep nullable but NOT ideal for long term)
    news_id = Column(BigInteger, ForeignKey("news.id"), nullable=True)
    weather_id = Column(BigInteger, ForeignKey("weather.id"), nullable=True)

    # Core LLM outputs
    ai_summary = Column(Text, nullable=False)
    consequence = Column(Text, nullable=False)

    # Geospatial (center + radius in km)
    center_lat = Column(Float, nullable=False)
    center_long = Column(Float, nullable=False)
    radius_km = Column(Float, nullable=False)

    # Strongly recommended additions (don’t skip these)
    severity = Column(Integer, nullable=False)  # 1–5 scale
    confidence = Column(Float, nullable=False)  # 0–1

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)