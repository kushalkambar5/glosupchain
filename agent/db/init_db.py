from sqlalchemy import create_engine
from db.base import Base
from core.config import settings

# Import ALL models here so SQLAlchemy registers them before create_all()
import models.keyword      # noqa: F401
import models.location     # noqa: F401
import models.news         # noqa: F401
import models.weather      # noqa: F401
import models.user         # noqa: F401
import models.message      # noqa: F401
import models.shipwaysResult  # noqa: F401
import models.weatherResult   # noqa: F401
import models.shipReroutes    # noqa: F401

def init_db():
    engine = create_engine(settings.DATABASE_URL)

    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    print("Tables created (if not exist)")