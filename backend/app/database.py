"""
Database connection and initialization.
"""
import os
import sqlite3
from contextlib import contextmanager

from .config import settings

# Ensure directories exist
os.makedirs(settings.DATA_DIR, exist_ok=True)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.THUMBNAIL_DIR, exist_ok=True)


def get_db():
    conn = sqlite3.connect(settings.DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def get_db_context():
    """Context manager for database connections."""
    conn = get_db()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def setup_database():
    conn = get_db()
    
    # Products table
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
    
    # Product images table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS product_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            filename TEXT,
            is_main INTEGER DEFAULT 0,
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    """)
    
    # Product sizes table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS product_sizes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            size TEXT,
            quantity INTEGER,
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    """)
    
    # Categories table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            image_filename TEXT,
            display_order INTEGER DEFAULT 0
        )
    """)
    
    # Product-Categories junction table
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
    
    # Add columns if they don't exist (migration support)
    _run_migrations(conn)
    
    conn.commit()
    conn.close()


def _run_migrations(conn):
    """Run database migrations for existing databases."""
    migrations = [
        ("products", "category", "TEXT"),
        ("products", "color", "TEXT"),
        ("products", "gsm", "TEXT"),
        ("products", "age_group", "TEXT"),
        ("products", "description", "TEXT"),
        ("products", "sale_price", "INTEGER"),
        ("products", "discount_percent", "INTEGER"),
        ("product_images", "is_main", "INTEGER DEFAULT 0"),
        ("categories", "display_order", "INTEGER DEFAULT 0"),
    ]
    
    for table, column, col_type in migrations:
        try:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
        except sqlite3.OperationalError:
            pass  # Column already exists


def migrate_existing_products():
    """Set first image as main for existing products that don't have a main image."""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM products")
    products = cursor.fetchall()
    
    for product in products:
        product_id = product["id"]
        cursor.execute(
            "SELECT COUNT(*) as count FROM product_images WHERE product_id = ? AND is_main = 1",
            (product_id,)
        )
        has_main = cursor.fetchone()["count"] > 0
        
        if not has_main:
            cursor.execute(
                "SELECT id FROM product_images WHERE product_id = ? ORDER BY id ASC LIMIT 1",
                (product_id,)
            )
            first_image = cursor.fetchone()
            if first_image:
                cursor.execute(
                    "UPDATE product_images SET is_main = 1 WHERE id = ?",
                    (first_image["id"],)
                )
    
    conn.commit()
    conn.close()


def migrate_categories_to_many_to_many():
    """Migrate existing single category field to many-to-many relationship."""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) as count FROM product_categories")
    already_migrated = cursor.fetchone()["count"] > 0
    
    if already_migrated:
        conn.close()
        return
    
    cursor.execute("SELECT id, category FROM products WHERE category IS NOT NULL AND category != ''")
    products = cursor.fetchall()
    
    for product in products:
        product_id = product["id"]
        category_name = product["category"]
        
        if category_name:
            cursor.execute("SELECT id FROM categories WHERE name = ?", (category_name,))
            category = cursor.fetchone()
            
            if not category:
                cursor.execute("INSERT INTO categories (name) VALUES (?)", (category_name,))
                category_id = cursor.lastrowid
            else:
                category_id = category["id"]
            
            try:
                cursor.execute(
                    "INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)",
                    (product_id, category_id)
                )
            except sqlite3.IntegrityError:
                pass
    
    conn.commit()
    conn.close()


def initialize_category_display_order():
    """Initialize display_order for existing categories that don't have it set."""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM categories WHERE display_order IS NULL")
    categories = cursor.fetchall()
    
    for index, category in enumerate(categories):
        cursor.execute(
            "UPDATE categories SET display_order = ? WHERE id = ?",
            (index, category["id"])
        )
    
    conn.commit()
    conn.close()


def init_db():
    """Initialize database and run all migrations."""
    setup_database()
    migrate_existing_products()
    migrate_categories_to_many_to_many()
    initialize_category_display_order()
