"""
Application configuration and environment variables.
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""
    
    # Authentication
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
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


settings = Settings()
