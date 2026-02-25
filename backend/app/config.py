import logging
import secrets as _secrets
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


def _generate_dev_secret() -> str:
    """Generate a random secret for development (NOT for production)."""
    return _secrets.token_hex(64)


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    database_url: str = "sqlite:///./timesheet.db"
    
    # JWT — no hardcoded default; MUST be set via .env
    secret_key: str = ""
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    
    # Google Gemini — no hardcoded key
    gemini_api_key: str = ""
    
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

    # Encryption
    encryption_key: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


# Single instance - created fresh on module load
_settings = None

def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
        # Validate critical secrets at startup
        if not _settings.secret_key or _settings.secret_key == "your-super-secret-key-change-in-production":
            generated = _generate_dev_secret()
            logger.warning(
                "[Config] SECRET_KEY is not set or using the insecure default! "
                "Auto-generating a random key for this session. "
                "Set SECRET_KEY in .env for production."
            )
            _settings.secret_key = generated
        if not _settings.gemini_api_key:
            logger.warning("[Config] GEMINI_API_KEY is not set. AI features will be disabled.")
        else:
            logger.info(f"[Config] Gemini API key loaded (****{_settings.gemini_api_key[-4:]})")
        if not _settings.encryption_key:
            logger.warning("[Config] ENCRYPTION_KEY is not set. Sensitive fields will NOT be encrypted at rest.")
    return _settings
