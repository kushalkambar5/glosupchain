import os
import sys

# Add agent directory to path
agent_path = os.path.dirname(os.path.abspath(__file__))
sys.path.append(agent_path)

from services.news_service import NewsService
from services.weather_service import WeatherService
from core.config import settings

def test_news():
    print("Testing NewsService...")
    service = NewsService()
    try:
        results = service.fetch_news("logistics")
        print(f"News results count: {len(results)}")
        if results:
            print(f"Sample news: {results[0].get('title')}")
    except Exception as e:
        print(f"News error: {e}")

def test_weather():
    print("\nTesting WeatherService...")
    service = WeatherService()
    try:
        results = service.get_weather("Mumbai")
        if "error" in results:
            print(f"Weather API error: {results['error']}")
        else:
            print(f"Weather in Mumbai: {results['current']['temp_c']}C, {results['current']['condition']['text']}")
    except Exception as e:
        print(f"Weather error: {e}")

if __name__ == "__main__":
    test_news()
    test_weather()
