import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from db.base import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    password = Column(String(255), nullable=False)
    role = Column(String(50), default="driver")
    is_verified = Column(Boolean, default=False)
    location = Column(String(255), nullable=True)
    work_done = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    longterm_memory = Column(Text, nullable=True)
    threads = Column(JSON, default=list)
