from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "RL Training Data Platform"
    environment: str = "development"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://rlplatform:secret@localhost:5432/rlplatform"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Auth
    secret_key: str = "change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # LLM
    groq_api_key: str = "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"
    groq_model: str = "llama-3.1-8b-instant"

    @property
    def is_development(self) -> bool:
        return self.environment == "development"


settings = Settings()
