from sqlalchemy import (
    Column, Integer, String, Date, DateTime,
    Boolean, Enum, UniqueConstraint, CheckConstraint
)
from db.base import Base
from datetime import datetime
import enum


class KeywordType(enum.Enum):
    DAILY = "daily"
    ONEDAY = "oneday"


class Keyword(Base):
    __tablename__ = "keywords"

    id = Column(Integer, primary_key=True, autoincrement=True)

    word = Column(String(120), nullable=False)

    type = Column(Enum(KeywordType, native_enum=False), nullable=False)

    date = Column(Date, nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("word", "type", "date", name="uq_word_type_date"),

        CheckConstraint(
            "(type = 'daily' AND date IS NULL) OR "
            "(type = 'oneday' AND date IS NOT NULL)",
            name="check_type_date_consistency"
        ),
    )