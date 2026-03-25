"""
Yakimoto Dojo E-commerce API

FastAPI application for managing products, categories, and orders.
"""
from datetime import datetime

from fastapi import Body, FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import get_db_context, init_db
from .routes import (
    products_router,
    categories_router,
    auth_router,
    checkout_router,
    admin_router,
    orders_router,
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
app.include_router(orders_router)

# Initialize database on startup
init_db()


@app.get("/")
def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "Yakimoto Dojo API"}


@app.post("/consent-log")
def log_consent(body: dict = Body(...)):
    action = body.get("action")
    if action not in ("accepted", "declined"):
        return {"message": "ignored"}
    with get_db_context() as conn:
        conn.execute(
            "INSERT INTO consent_log (action, created_at) VALUES (?, ?)",
            (action, datetime.utcnow().isoformat()),
        )
    return {"message": "logged"}


@app.get("/consent-stats")
def consent_stats():
    with get_db_context() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT action, COUNT(*) as count FROM consent_log GROUP BY action"
        )
        rows = cursor.fetchall()
    stats = {row["action"]: row["count"] for row in rows}
    return {"accepted": stats.get("accepted", 0), "declined": stats.get("declined", 0)}
