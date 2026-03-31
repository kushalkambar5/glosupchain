import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped
from typing import List, Optional, TYPE_CHECKING
from db.base import Base
from datetime import datetime

if TYPE_CHECKING:
    from .extraModels import Drivers, Routes, Assignments

class Users(Base):
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
    threads = Column(JSON, default=list) # Drizzle: json().default([])
    owned_ships = Column(JSON, default=list)

    # Relationships (Standardizing with pluralized class name 'Users')
    drivers: Mapped[List["Drivers"]] = relationship("Drivers", back_populates="user")
    routes: Mapped[List["Routes"]] = relationship("Routes", back_populates="manager")
    assignments_driver: Mapped[List["Assignments"]] = relationship(
        "Assignments", 
        foreign_keys="[Assignments.driver_id]", 
        back_populates="driver"
    )
    assignments_manager: Mapped[List["Assignments"]] = relationship(
        "Assignments", 
        foreign_keys="[Assignments.manager_id]", 
        back_populates="manager"
    )