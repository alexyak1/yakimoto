"""
Pytest fixtures for Yakimoto Dojo backend tests.
"""
import json
import os
import sqlite3
import tempfile
import time
from typing import Generator

import jwt
import pytest

# Set test environment variables before importing app
os.environ["ADMIN_PASSWORD"] = "test_password"
os.environ["JWT_SECRET"] = "test_jwt_secret_key_for_testing"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["JWT_EXP_DELTA_SECONDS"] = "3600"
os.environ["STRIPE_SECRET_KEY"] = "sk_test_fake"
os.environ["STRIPE_PUBLISHABLE_KEY"] = "pk_test_fake"

# TestClient import is deferred to avoid errors if httpx is not installed
# It will be imported in the client fixture when needed


@pytest.fixture(scope="function")
def test_db(tmp_path) -> Generator[str, None, None]:
    """
    Create a temporary test database.
    
    Yields the path to the test database file.
    """
    db_path = tmp_path / "test_database.db"
    
    # Create tables
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    
    conn.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            price INTEGER,
            image TEXT,
            sizes TEXT,
            category TEXT,
            color TEXT,
            gsm TEXT,
            age_group TEXT,
            description TEXT,
            sale_price INTEGER,
            discount_percent INTEGER
        )
    """)
    
    conn.execute("""
        CREATE TABLE IF NOT EXISTS product_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            filename TEXT,
            is_main INTEGER DEFAULT 0,
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    """)
    
    conn.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            image_filename TEXT,
            display_order INTEGER DEFAULT 0
        )
    """)
    
    conn.execute("""
        CREATE TABLE IF NOT EXISTS product_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            category_id INTEGER,
            FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
            FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE,
            UNIQUE(product_id, category_id)
        )
    """)
    
    conn.commit()
    conn.close()
    
    yield str(db_path)


@pytest.fixture(scope="function")
def test_db_with_data(test_db) -> str:
    """
    Create a test database populated with sample data.
    """
    conn = sqlite3.connect(test_db)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Insert categories
    cursor.execute("INSERT INTO categories (name, display_order) VALUES (?, ?)", ("Gi", 0))
    cursor.execute("INSERT INTO categories (name, display_order) VALUES (?, ?)", ("Belts", 1))
    gi_category_id = 1
    belts_category_id = 2
    
    # Insert products
    sizes_json = json.dumps({"170": {"online": 5, "club": 2}, "180": {"online": 3, "club": 0}})
    cursor.execute(
        """INSERT INTO products (name, price, sizes, category, color, description, sale_price, discount_percent) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        ("Judo Gi White", 1500, sizes_json, "Gi", "white", "Premium judo gi", None, None)
    )
    product_id_1 = cursor.lastrowid
    
    cursor.execute(
        """INSERT INTO products (name, price, sizes, category, color, description, sale_price, discount_percent) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        ("Black Belt", 300, json.dumps({"S": {"online": 10, "club": 5}}), "Belts", "black", "Black belt", 250, None)
    )
    product_id_2 = cursor.lastrowid
    
    # Link products to categories
    cursor.execute(
        "INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)",
        (product_id_1, gi_category_id)
    )
    cursor.execute(
        "INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)",
        (product_id_2, belts_category_id)
    )
    
    # Add product images
    cursor.execute(
        "INSERT INTO product_images (product_id, filename, is_main) VALUES (?, ?, ?)",
        (product_id_1, "test_image_1.jpg", 1)
    )
    cursor.execute(
        "INSERT INTO product_images (product_id, filename, is_main) VALUES (?, ?, ?)",
        (product_id_1, "test_image_2.jpg", 0)
    )
    
    conn.commit()
    conn.close()
    
    return test_db


@pytest.fixture(scope="function")
def app_with_test_db(test_db, tmp_path, monkeypatch):
    """
    Create FastAPI app with test database.
    """
    # Set up test directories
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    thumbnail_dir = upload_dir / "thumbnails"
    thumbnail_dir.mkdir()
    
    # Patch settings
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    
    from app.config import settings
    monkeypatch.setattr(settings, "DB_FILE", test_db)
    monkeypatch.setattr(settings, "DATA_DIR", str(tmp_path))
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(upload_dir))
    monkeypatch.setattr(settings, "THUMBNAIL_DIR", str(thumbnail_dir))
    
    # Import after patching
    from app.main import app
    from app.database import setup_database
    
    return app


@pytest.fixture(scope="function")
def client(app_with_test_db):
    """
    Create a test client for the FastAPI app.
    
    Requires httpx to be installed.
    """
    try:
        from fastapi.testclient import TestClient
    except (ImportError, RuntimeError):
        pytest.skip("httpx not installed - run: pip install httpx")
    return TestClient(app_with_test_db)


@pytest.fixture(scope="function")
def auth_token() -> str:
    """
    Generate a valid JWT token for authenticated requests.
    """
    payload = {
        "sub": "admin",
        "exp": time.time() + 3600
    }
    token = jwt.encode(payload, "test_jwt_secret_key_for_testing", algorithm="HS256")
    return token


@pytest.fixture(scope="function")
def auth_headers(auth_token) -> dict:
    """
    Get authorization headers with valid JWT token.
    """
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="function")
def expired_token() -> str:
    """
    Generate an expired JWT token for testing auth failures.
    """
    payload = {
        "sub": "admin",
        "exp": time.time() - 3600  # Expired 1 hour ago
    }
    token = jwt.encode(payload, "test_jwt_secret_key_for_testing", algorithm="HS256")
    return token


@pytest.fixture
def sample_product_data() -> dict:
    """
    Sample product data for testing product creation.
    """
    return {
        "name": "Test Gi",
        "price": 1000,
        "sizes": json.dumps({"170": {"online": 5, "club": 0}}),
        "category": "Gi",
        "color": "blue",
        "description": "A test gi for testing",
    }


@pytest.fixture
def sample_order_data() -> dict:
    """
    Sample order data for testing checkout.
    """
    return {
        "customer": {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john@example.com",
            "phone": "+46701234567",
            "payment": "stripe"
        },
        "items": [
            {
                "id": 1,
                "name": "Judo Gi White",
                "price": 1500,
                "quantity": 1,
                "selectedSize": "170"
            }
        ],
        "total": 1500
    }
