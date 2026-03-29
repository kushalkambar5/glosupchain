import os
import sys

# Add the parent directory to sys.path if run directly so core/models can be imported
if __name__ == "__main__":
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from newsdataapi import NewsDataApiClient
from core.config import settings
from sqlalchemy.orm import Session
from models.news import News
from models.keyword import Keyword, KeywordRule
from datetime import datetime, date, timedelta


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
                pubDateTz=article.get("pubDateTZ"),
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

    def fetch_and_store_news(self, query: str, db: Session):
        results = self.fetch_news(query)
        self.store_news(results, db)

    def fetch_and_store_daily_news(self, db: Session):
        rules = (
            db.query(KeywordRule)
            .join(Keyword)
            .filter(
                KeywordRule.type == "daily",
                KeywordRule.is_active == True
            )
            .all()
        )

        unique_keywords = set(rule.keyword.word for rule in rules)

        for word in unique_keywords:
            self.fetch_and_store_news(word, db)

    def fetch_and_store_oneday_news(self, db: Session):
        today = date.today()

        rules = (
            db.query(KeywordRule)
            .join(Keyword)
            .filter(
                KeywordRule.type == "oneday",
                KeywordRule.date == today,
                KeywordRule.is_active == True
            )
            .all()
        )

        for rule in rules:
            self.fetch_and_store_news(rule.keyword.word, db)
        
    def get_daily_news(self, db: Session):
        cutoff = datetime.utcnow() - timedelta(days=1)

        return (
            db.query(News)
            .filter(News.created_at >= cutoff)
            .all()
        )

    def get_daily_news_for_processing(self, db: Session):
        cutoff = datetime.utcnow() - timedelta(days=1)

        news_items = (
            db.query(News)
            .filter(News.created_at >= cutoff)
            .all()
        )
        
        return [
            {
                "article_id": item.article_id,
                "title": item.title,
                "description": item.description,
                "content": item.content,
                "keywords": item.keywords,
                "category": item.category
            }
            for item in news_items
        ]

    def get_recent_news(self, db: Session, hours=3):
        cutoff = datetime.utcnow() - timedelta(hours=hours)

        return (
            db.query(News)
            .filter(News.created_at >= cutoff)
            .all()
        )

    def fetch_and_store_daily_news_of_all_keywords(self, db: Session):
        rules = (
            db.query(KeywordRule)
            .join(Keyword)
            .filter(
                KeywordRule.type == "daily",
                KeywordRule.is_active == True
            )
            .all()
        )

        unique_keywords = set(rule.keyword.word for rule in rules)

        for word in unique_keywords:
            self.fetch_and_store_news(word, db)

