from sqlalchemy import (
    Column, Integer, BigInteger, String, DateTime,
    Boolean, Float, UniqueConstraint, Index
)
from db.base import Base
from datetime import datetime


class Location(Base):
    __tablename__ = "locations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)

    country = Column(String(100), nullable=False)
    continent = Column(String(100))

    latitude = Column(Float)
    longitude = Column(Float)

    priority = Column(String(20))

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("name", "country", name="uq_location_name_country"),
        Index("idx_location_type", "type"),
        Index("idx_location_priority", "priority"),
    )