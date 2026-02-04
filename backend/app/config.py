from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    database_url: str = "sqlite:///./timesheet.db"
    
    # JWT
    secret_key: str = "your-super-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    
    # Google Gemini
    gemini_api_key: str = "AIzaSyB5hMK93SXdRFEEibtQHqyh1TyKr2Hz5pQ"
    
    # CORS
    cors_origins: str = "http://localhost:3000"
    
    class Config:
        env_file = ".env"
        extra = "ignore"


# Single instance - created fresh on module load
_settings = None

def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
        print(f"[Config] Loaded API Key: {_settings.gemini_api_key[:20]}...")
    return _settings
