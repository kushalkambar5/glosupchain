# Keyword types
KEYWORD_TYPE_DAILY = "daily"
KEYWORD_TYPE_ONEDAY = "oneday"

KEYWORD_TYPES = {KEYWORD_TYPE_DAILY, KEYWORD_TYPE_ONEDAY}


# News classification labels (LLM output)
NEWS_CATEGORY_DISRUPTION = "disruption"
NEWS_CATEGORY_NORMAL = "normal"
NEWS_CATEGORY_IRRELEVANT = "irrelevant"

NEWS_CATEGORIES = {
    NEWS_CATEGORY_DISRUPTION,
    NEWS_CATEGORY_NORMAL,
    NEWS_CATEGORY_IRRELEVANT,
}


# Severity levels
SEVERITY_LOW = "low"
SEVERITY_MEDIUM = "medium"
SEVERITY_HIGH = "high"

SEVERITY_LEVELS = {
    SEVERITY_LOW,
    SEVERITY_MEDIUM,
    SEVERITY_HIGH,
}


# Default limits
MAX_NEWS_PER_FETCH = 50
MAX_RETRIES = 3
TIMEOUT_SECONDS = 10


# External APIs
NEWS_API_BASE_URL = "https://newsdata.io/api/1/news"
WEATHER_API_BASE_URL = "https://api.weatherapi.com/v1/current.json"