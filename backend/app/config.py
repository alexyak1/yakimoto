"""
Application configuration and environment variables.
"""
import os
import secrets
import sys
import warnings
from dotenv import load_dotenv

load_dotenv()


class ConfigurationError(Exception):
    """Raised when required configuration is missing."""
    pass


def _get_jwt_secret() -> str:
    """
    Get JWT secret from environment or generate a secure random one.
    
    In production, a missing JWT_SECRET is a fatal error.
    In development, a random secret is generated with a warning.
    """
    secret = os.getenv("JWT_SECRET", "")
    env = os.getenv("ENV", "development").lower()
    
    if secret:
        return secret
    
    if env == "production":
        raise ConfigurationError(
            "JWT_SECRET must be set in production environment. "
            "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
        )
    
    # Development mode: generate random secret
    generated_secret = secrets.token_hex(32)
    warnings.warn(
        "JWT_SECRET not set. Using auto-generated secret. "
        "Sessions will not persist across restarts. "
        "Set JWT_SECRET in .env for persistent sessions.",
        RuntimeWarning
    )
    return generated_secret


def _get_admin_password() -> str:
    """
    Get admin password from environment.
    
    In production, a missing or weak password is a fatal error.
    In development, an empty password triggers a warning.
    """
    password = os.getenv("ADMIN_PASSWORD", "")
    env = os.getenv("ENV", "development").lower()
    
    if env == "production":
        if not password:
            raise ConfigurationError(
                "ADMIN_PASSWORD must be set in production environment."
            )
        if len(password) < 8:
            raise ConfigurationError(
                "ADMIN_PASSWORD must be at least 8 characters in production."
            )
    elif not password:
        warnings.warn(
            "ADMIN_PASSWORD not set. Admin login will fail. "
            "Set ADMIN_PASSWORD in .env file.",
            RuntimeWarning
        )
    
    return password


class Settings:
    """Application settings loaded from environment variables."""
    
    # Environment
    ENV: str = os.getenv("ENV", "development").lower()
    
    # Authentication (validated)
    ADMIN_PASSWORD: str = _get_admin_password()
    JWT_SECRET: str = _get_jwt_secret()
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXP_DELTA_SECONDS: int = int(os.getenv("JWT_EXP_DELTA_SECONDS", 3600))
    
    # Database
    DATA_DIR: str = os.getenv("DATA_DIR", "app")
    DB_FILE: str = os.path.join(DATA_DIR, "database.db")
    
    # File uploads
    UPLOAD_DIR: str = "app/uploads"
    THUMBNAIL_DIR: str = os.path.join(UPLOAD_DIR, "thumbnails")
    
    # Image optimization
    MAX_IMAGE_SIZE: tuple = (1920, 1920)
    IMAGE_QUALITY: int = 85
    THUMBNAIL_SIZE: tuple = (400, 400)
    THUMBNAIL_QUALITY: int = 80
    
    # Stripe
    STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_PUBLISHABLE_KEY: str = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
    
    # Email
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAIL_RECEIVER: str = os.getenv("EMAIL_RECEIVER", "")
    
    # CORS
    CORS_ORIGINS: list = [
        "http://192.168.0.100:5173",
        "http://localhost",
        "http://localhost:80",
        "http://192.168.0.100",
        "http://192.168.0.100:80",
        "http://localhost:5173",
        "http://192.168.0.100:5173",
        "http://46.62.154.96",
        "http://yakimoto.se",
        "https://www.yakimoto.se",
    ]


# Initialize settings - will raise ConfigurationError if production secrets missing
try:
    settings = Settings()
except ConfigurationError as e:
    print(f"FATAL: Configuration error: {e}", file=sys.stderr)
    sys.exit(1)
