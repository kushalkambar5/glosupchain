from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.user import Users
from core.config import settings

engine = create_engine(settings.DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    print("--- CHECKING SHIPS ---")
    users = db.query(Users).all()
    found = False
    for u in users:
        if u.owned_ships:
            print(f"User {u.id} ({u.email}) HAS SHIPS: {u.owned_ships}")
            found = True
    if not found:
        print("NO USERS HAVE OWNED SHIPS")
    print("--- END CHECK ---")
finally:
    db.close()
