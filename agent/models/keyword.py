from sqlalchemy import (
    Column, Integer, String, Date, DateTime,
    Boolean, ForeignKey, CheckConstraint, Index, text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.base import Base


class Keyword(Base):
    __tablename__ = "keywords"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # DO NOT use unique=True (DB handles it via index)
    word = Column(String(120), nullable=False)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    rules = relationship(
        "KeywordRule",
        back_populates="keyword",
        cascade="all, delete-orphan"
    )


class KeywordRule(Base):
    __tablename__ = "keyword_rules"

    id = Column(Integer, primary_key=True, autoincrement=True)

    keyword_id = Column(
        Integer,
        ForeignKey("keywords.id", ondelete="CASCADE"),
        nullable=False
    )

    type = Column(String(10), nullable=False)  # 'daily' or 'oneday'

    date = Column(Date, nullable=True)

    is_active = Column(Boolean, nullable=False, server_default=text("true"))

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    keyword = relationship("Keyword", back_populates="rules")

    __table_args__ = (
        CheckConstraint(
            "(type = 'daily' AND date IS NULL) OR "
            "(type = 'oneday' AND date IS NOT NULL)",
            name="check_type_date_consistency"
        ),
        Index("idx_keyword_rules_type_active", "type", "is_active"),
    )