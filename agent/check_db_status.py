import sys
import os
from sqlalchemy import func
from db.session import SessionLocal
from models.news import News
from models.shipwaysResult import ShipwayResult
from models.keyword import Keyword, KeywordRule

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def check_db():
    db = SessionLocal()
    try:
        news_count = db.query(func.count(News.id)).scalar()
        shipway_count = db.query(func.count(ShipwayResult.id)).scalar()
        keyword_count = db.query(func.count(Keyword.id)).scalar()
        daily_rules = db.query(func.count(KeywordRule.id)).filter(KeywordRule.type == 'daily', KeywordRule.is_active == True).scalar()
        
        print(f"--- Database Status ---")
        print(f"Total News: {news_count}")
        print(f"Total Shipway Results: {shipway_count}")
        print(f"Total Keywords: {keyword_count}")
        print(f"Active Daily Keyword Rules: {daily_rules}")
        
        if news_count > 0:
            latest = db.query(News).order_by(News.created_at.desc()).first()
            print(f"Latest News created at: {latest.created_at} (UTC)")
        
        if shipway_count > 0:
            latest_res = db.query(ShipwayResult).order_by(ShipwayResult.created_at.desc()).first()
            print(f"Latest ShipwayResult created at: {latest_res.created_at} (UTC)")
            
    except Exception as e:
        import traceback
        print(f"Error checking DB: {e}")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_db()
