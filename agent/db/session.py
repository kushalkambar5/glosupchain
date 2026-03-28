from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    echo=True  # logs SQL (good for debugging)
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)