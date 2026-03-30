import uuid
from sqlalchemy import Column, String, JSON
from sqlalchemy.dialects.postgresql import UUID
from db.base import Base

class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(String(255), nullable=False, index=True)
    messages = Column(JSON, default=list)
