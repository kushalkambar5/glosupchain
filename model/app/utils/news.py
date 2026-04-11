import sys
import os

# Allow direct execution by adding the project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.config import get_db_connection

def get_latest_news(limit=10):
    """
    Fetches the latest summarized news from the Postgres database.
    """
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            query = """
                SELECT title, description, content, ai_summary, category 
                FROM news 
                WHERE created_at >= NOW() - INTERVAL '2 hours'
                ORDER BY created_at DESC 
                LIMIT %s
            """
            cursor.execute(query, (limit,))
            news_items = cursor.fetchall()
            return [dict(row) for row in news_items]
    except Exception as e:
        print(f"Error fetching news from DB: {e}")
        return []
    finally:
        if conn is not None:
            conn.close()

def get_news_for_location(lat: float, lon: float, limit=5):
    """
    Fetches the latest news mentioning the city found from the given coordinates.
    """
    from app.utils.weather import get_city_from_coords
    
    city_name = get_city_from_coords(lat, lon)
    if not city_name:
        return {"error": "Could not determine city from coordinates."}

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            query = """
                SELECT title, description, content, ai_summary, category 
                FROM news 
                WHERE (title ILIKE %s OR keywords ILIKE %s OR ai_region ILIKE %s)
                  AND created_at >= NOW() - INTERVAL '2 hours'
                ORDER BY created_at DESC 
                LIMIT %s
            """
            like_city = f"%{city_name}%"
            cursor.execute(query, (like_city, like_city, like_city, limit))
            news_items = cursor.fetchall()
            return {"city": city_name, "news": [dict(row) for row in news_items]}
    except Exception as e:
        print(f"Error fetching news for {city_name} from DB: {e}")
        return {"city": city_name, "error": str(e)}
    finally:
        if conn is not None:
            conn.close()

def get_shipway_results(limit=1000):
    """
    Fetches the latest Shipway results directly from the Postgres database.
    """
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            query = """
                SELECT sr.* 
                FROM shipway_results sr
                LEFT JOIN news n ON sr.news_id = n.id
                WHERE n.created_at >= NOW() - INTERVAL '2 hours'
                   OR sr.news_id IS NULL
                LIMIT %s
            """
            cursor.execute(query, (limit,))
            results = cursor.fetchall()
            return [dict(row) for row in results]
    except Exception as e:
        print(f"Error fetching Shipway results from DB: {e}")
        return []
    finally:
        if conn is not None:
            conn.close()

if __name__ == "__main__":
    print(get_shipway_results())