import uuid
from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from db.base import Base
from datetime import datetime

class ShipReroute(Base):
    __tablename__ = "ship_reroutes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    ship_id = Column(Integer, nullable=False)
    
    # Store IDs as JSON lists since SQLAlchemy generic List + ForeignKey is not natively supported like that.
    affected_by_news = Column(JSON, default=list, nullable=False)
    affected_by_weather = Column(JSON, default=list, nullable=False)
    
    suggestion = Column(Text, nullable=False)
    best_route = Column(JSON, nullable=False) # Will store list of [lat, long] lists
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
