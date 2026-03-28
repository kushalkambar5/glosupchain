import os
import sys

# Add the parent directory to sys.path if run directly so core/models can be imported
if __name__ == "__main__":
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from newsdataapi import NewsDataApiClient
from core.config import settings
from sqlalchemy.orm import Session
from models.news import News
from datetime import datetime


class NewsService:
    def __init__(self):
        self.client = NewsDataApiClient(apikey=settings.NEWS_API_KEY)

    def fetch_news(self, query: str):
        response = self.client.latest_api(q=query, language="en", size=10)
        return response.get("results", [])

    def store_news(self, articles: list, db: Session):
        for article in articles:
            article_id = article.get("article_id")
            if not article_id:
                continue

            existing = db.query(News).filter_by(article_id=article_id).first()
            if existing:
                continue

            news = News(
                article_id=article_id,
                link=article.get("link"),
                title=article.get("title", ""),
                description=article.get("description"),
                content=article.get("content"),
                keywords=",".join(article.get("keywords") or []),
                creator=",".join(article.get("creator") or []),
                language=article.get("language"),
                country=",".join(article.get("country") or []),
                category=",".join(article.get("category") or []),
                datatype=article.get("datatype"),
                pubDate=article.get("pubDate"),
                pubDateTZ=article.get("pubDateTZ"),
                fetched_at=article.get("fetched_at"),
                image_url=article.get("image_url"),
                video_url=article.get("video_url"),
                source_id=article.get("source_id"),
                source_name=article.get("source_name"),
                source_priority=article.get("source_priority"),
                source_url=article.get("source_url"),
                source_icon=article.get("source_icon"),
                sentiment=article.get("sentiment"),
                sentiment_stats=article.get("sentiment_stats"),
                ai_tag=article.get("ai_tag"),
                ai_region=article.get("ai_region"),
                ai_org=article.get("ai_org"),
                ai_summary=article.get("ai_summary"),
                duplicate=article.get("duplicate", False),
                consequence=article.get("consequence"),
            )

            db.add(news)

        db.commit()

    def _parse_date(self, date_str):
        if not date_str:
            return None
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))


# if __name__ == "__main__":
#     from db.session import SessionLocal, engine
#     from db.base import Base
#     from models.news import News  # Ensure model is registered with Base

#     # Create tables if they don't exist
#     Base.metadata.create_all(bind=engine)

#     news_service = NewsService()
#     results = news_service.fetch_news("supply chain")
#     print(f"Fetched {len(results)} articles")
#     for r in results[:10]:
#         print(f"  - {r.get('title', 'No title')}")
#         print(f"  - {r.get('description', 'No Description')}")

#     db = SessionLocal()
#     try:
#         news_service.store_news(results, db)
#         print("Stored news successfully")
#     except Exception as e:
#         db.rollback()
#         print(f"Error storing news: {e}")
#     finally:
#         db.close()