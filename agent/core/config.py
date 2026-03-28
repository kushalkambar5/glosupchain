from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Global Supply Chain"
    ENV: str = "dev"

    # Database
    DATABASE_URL: str = "postgresql+psycopg2://bkv:globalsupplychain@15.206.160.22:5432/supplychain"

    # APIs
    NEWS_API_KEY: str = "pub_9b2e24abca124939b9906527981ef01c"
    WEATHER_API_KEY: str = "a2226e1a74aa4136b2162252262803"

    # Agent configs
    LLM_PROVIDER: str = "gemini"  # gemini / openai
    LLM_API_KEY: str = ""

    # Polling configs
    NEWS_FETCH_INTERVAL_MIN: int = 60
    WEATHER_FETCH_INTERVAL_MIN: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )


@lru_cache
def get_settings():
    return Settings()


settings = get_settings()