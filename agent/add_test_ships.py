from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.user import Users
from core.config import settings

# A larger, more diverse set of MMSIs to increase chances of catching them in a 120s window.
TEST_MMSIS = [
    211281610, 353136000, 477103600, 244199000, 351161000, 
    218768000, 235118000, 636018353, 413456000, 374123000,
    538006834, 311000000, 412000000, 247000000, 319000000,
    419000000, 257000000, 304000000, 219000000, 352000000
]

engine = create_engine(settings.DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    user = db.query(Users).first()
    if user:
        print(f"Updating user {user.id} ({user.email}) with 20 diverse test ships.")
        user.owned_ships = TEST_MMSIS
        db.commit()
        print("Success!")
    else:
        print("No users found to update.")
finally:
    db.close()
