from sqlalchemy import create_engine
from db.base import Base
from core.config import settings

def init_db():
    engine = create_engine(settings.DATABASE_URL)

    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    print("Tables created (if not exist)") 