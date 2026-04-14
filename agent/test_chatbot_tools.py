import os
import sys
import asyncio

# Add agent directory to path
agent_path = os.path.dirname(os.path.abspath(__file__))
sys.path.append(agent_path)

from tools.chatbot import fetch_news, get_weather

async def test_chatbot_tools():
    print("Testing fetch_news tool...")
    # Using the tool locally - it expects a 'query' string
    try:
        news_output = fetch_news.invoke({"query": "global shipping"})
        print("News Tool Output (Concise):\n")
        print(news_output)
    except Exception as e:
        print(f"News Tool Error: {e}")

    print("\n" + "="*50 + "\n")

    print("Testing get_weather tool...")
    try:
        weather_output = get_weather.invoke({"city": "Singapore"})
        print("Weather Tool Output (Concise):\n")
        print(weather_output)
    except Exception as e:
        print(f"Weather Tool Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_chatbot_tools())
