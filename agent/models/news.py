from sqlalchemy import (
    Column, BigInteger, String, Date, DateTime,
    Boolean, Enum, UniqueConstraint, CheckConstraint
)
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class News(Base):
    __tablename__ = "news"

    id = Column(BigInteger, primary_key=True)

    article_id = Column(String(255), nullable=False)

    link = Column(String(255), nullable=False)

    title = Column(String(255), nullable=False)

    description = Column(String(255), nullable=False)

    content = Column(String(255), nullable=False)

    keywords = Column(String(255), nullable=False)

    creator = Column(String(255), nullable=False)

    language = Column(String(255), nullable=False)

    country = Column(String(255), nullable=False)

    category = Column(String(255), nullable=False)

    datatype = Column(String(255), nullable=False)

    pubDate = Column(String(255), nullable=False)

    pubDateTZ = Column(String(255), nullable=False)

    fetched_at = Column(String(255), nullable=False)

    image_url = Column(String(255), nullable=False)

    video_url = Column(String(255), nullable=False)

    source_id = Column(String(255), nullable=False)

    source_name = Column(String(255), nullable=False)

    source_priority = Column(String(255), nullable=False)

    source_url = Column(String(255), nullable=False)

    source_icon = Column(String(255), nullable=False)

    sentiment = Column(String(255), nullable=False)

    sentiment_stats = Column(String(255), nullable=False)

    ai_tag = Column(String(255), nullable=False)

    ai_region = Column(String(255), nullable=False)

    ai_org = Column(String(255), nullable=False)

    ai_summary = Column(String(255), nullable=False)

    duplicate = Column(String(255), nullable=False)

    consequence = Column(String(255), nullable=False)

    created_at = Column(String(255), nullable=False)

    updated_at = Column(String(255), nullable=False)

























id
article_id
article_id
link
title
description
content
keywords
creator
language
country
category
datatype
pubDate
pubDateTZ
fetched_at
image_url
video_url
source_id
source_name
source_priority
source_url
source_icon
sentiment
sentiment_stats
ai_tag
ai_region
ai_org
ai_summary
duplicate
consequence
created_at
updated_at