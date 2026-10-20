from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str = "change-me-in-production"
    APP_NAME: str = "TMS Backend"
    DEV_MODE: bool = True  # testing ke waqt True, production mein False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()