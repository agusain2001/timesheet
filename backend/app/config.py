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
    gemini_api_key: str = "AIzaSyBoSNmSGPXxlPr91tRCihkIHeZ7IcqEJQU"
    
    # CORS
    cors_origins: str = "http://localhost:3000"
    
    # OAuth Base URL (frontend URL for redirects)
    oauth_redirect_base_url: str = "http://localhost:3000"

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""

    # Microsoft (Outlook) OAuth
    microsoft_client_id: str = ""
    microsoft_client_secret: str = ""
    microsoft_tenant_id: str = "common"

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
