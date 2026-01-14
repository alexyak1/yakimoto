"""
Yakimoto Dojo E-commerce API

FastAPI application for managing products, categories, and orders.
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .routes import (
    products_router,
    categories_router,
    auth_router,
    checkout_router,
    admin_router,
)


# Initialize FastAPI app
app = FastAPI(
    title="Yakimoto Dojo API",
    description="E-commerce API for Yakimoto Dojo",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/thumbnails", StaticFiles(directory=settings.THUMBNAIL_DIR), name="thumbnails")

# Register routers
app.include_router(products_router)
app.include_router(categories_router)
app.include_router(auth_router)
app.include_router(checkout_router)
app.include_router(admin_router)

# Initialize database on startup
init_db()


@app.get("/")
def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "Yakimoto Dojo API"}
