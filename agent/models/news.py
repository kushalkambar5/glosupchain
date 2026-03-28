from sqlalchemy import (
    Column, BigInteger, Integer, String, Text, DateTime,
    Boolean, UniqueConstraint
)
from db.base import Base
from datetime import datetime


class News(Base):
    __tablename__ = "news"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    article_id = Column(String(255), nullable=False, unique=True)

    link = Column(Text, nullable=True)

    title = Column(Text, nullable=False)

    description = Column(Text, nullable=True)

    content = Column(Text, nullable=True)

    keywords = Column(Text, nullable=True)  # stored as comma-separated

    creator = Column(Text, nullable=True)  # stored as comma-separated

    language = Column(String(50), nullable=True)

    country = Column(Text, nullable=True)  # stored as comma-separated

    category = Column(Text, nullable=True)  # stored as comma-separated

    datatype = Column(String(50), nullable=True)

    pubDate = Column(String(50), nullable=True)

    pubDateTZ = Column(String(10), nullable=True)

    fetched_at = Column(String(50), nullable=True)

    image_url = Column(Text, nullable=True)

    video_url = Column(Text, nullable=True)

    source_id = Column(String(255), nullable=True)

    source_name = Column(String(255), nullable=True)

    source_priority = Column(Integer, nullable=True)

    source_url = Column(Text, nullable=True)

    source_icon = Column(Text, nullable=True)

    sentiment = Column(Text, nullable=True)

    sentiment_stats = Column(Text, nullable=True)

    ai_tag = Column(Text, nullable=True)

    ai_region = Column(Text, nullable=True)

    ai_org = Column(Text, nullable=True)

    ai_summary = Column(Text, nullable=True)

    duplicate = Column(Boolean, nullable=True, default=False)

    consequence = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)