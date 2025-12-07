from typing import List, Optional
import os
import time
import uuid
import sqlite3
import jwt
import shutil
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, Depends, Body, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from dotenv import load_dotenv

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import stripe
from PIL import Image, ImageOps
import io

load_dotenv()

app = FastAPI()

# Constants
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM")
JWT_EXP_DELTA_SECONDS = int(os.getenv("JWT_EXP_DELTA_SECONDS"))
# Use data directory for database (mounted as Docker volume in production)
# This ensures data persists across rebuilds and git operations
DATA_DIR = os.getenv("DATA_DIR", "app")
DB_FILE = os.path.join(DATA_DIR, "database.db")
UPLOAD_DIR = "app/uploads"

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# Stripe configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY")

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)
THUMBNAIL_DIR = os.path.join(UPLOAD_DIR, "thumbnails")
os.makedirs(THUMBNAIL_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/thumbnails", StaticFiles(directory=THUMBNAIL_DIR), name="thumbnails")

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://192.168.0.100:5173",
        "http://localhost",
        "http://localhost:80",
        "http://192.168.0.100",
        "http://192.168.0.100:80",
        "http://localhost:5173",           # dev
        "http://192.168.0.100:5173",       # local IP
        "http://46.62.154.96",             # ✅ production
        "http://yakimoto.se",    
        "https://www.yakimoto.se",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SQLite connection helper
def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

# Image optimization functions
def apply_exif_orientation(img: Image.Image) -> Image.Image:
    """Apply EXIF orientation to image if present"""
    try:
        img = ImageOps.exif_transpose(img)
    except Exception:
        # If EXIF data is missing or invalid, just return the image as-is
        pass
    return img

def optimize_image(image_bytes: bytes, max_size: tuple = (1920, 1920), quality: int = 85) -> bytes:
    """Resize and compress an image"""
    img = Image.open(io.BytesIO(image_bytes))
    
    # Apply EXIF orientation first
    img = apply_exif_orientation(img)
    
    # Convert RGBA to RGB if necessary (for JPEG)
    if img.mode in ('RGBA', 'LA', 'P'):
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Resize if image is larger than max_size
    img.thumbnail(max_size, Image.Resampling.LANCZOS)
    
    # Save to bytes with compression (exclude EXIF to avoid re-rotation)
    output = io.BytesIO()
    img.save(output, format='JPEG', quality=quality, optimize=True, exif=b'')
    return output.getvalue()

def create_thumbnail(image_bytes: bytes, size: tuple = (400, 400), quality: int = 80) -> bytes:
    """Create a thumbnail version of an image"""
    img = Image.open(io.BytesIO(image_bytes))
    
    # Apply EXIF orientation first
    img = apply_exif_orientation(img)
    
    # Convert RGBA to RGB if necessary
    if img.mode in ('RGBA', 'LA', 'P'):
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Create thumbnail
    img.thumbnail(size, Image.Resampling.LANCZOS)
    
    # Save to bytes (exclude EXIF to avoid re-rotation)
    output = io.BytesIO()
    img.save(output, format='JPEG', quality=quality, optimize=True, exif=b'')
    return output.getvalue()

# Setup DB schema
def setup_database():
    conn = get_db()
    # ⚠️ Remove these in production
    # conn.execute("DROP TABLE IF EXISTS products")
    # conn.execute("DROP TABLE IF EXISTS product_sizes")
    # conn.execute("DROP TABLE IF EXISTS product_images")

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
            description TEXT
        )
    """)
    
    # Add new columns if they don't exist (for existing databases)
    try:
        conn.execute("ALTER TABLE products ADD COLUMN category TEXT")
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    try:
        conn.execute("ALTER TABLE products ADD COLUMN color TEXT")
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    try:
        conn.execute("ALTER TABLE products ADD COLUMN gsm TEXT")
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    try:
        conn.execute("ALTER TABLE products ADD COLUMN age_group TEXT")
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    try:
        conn.execute("ALTER TABLE products ADD COLUMN description TEXT")
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    try:
        conn.execute("ALTER TABLE products ADD COLUMN sale_price INTEGER")
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    try:
        conn.execute("ALTER TABLE products ADD COLUMN discount_percent INTEGER")
    except sqlite3.OperationalError:
        pass  # Column already exists
    conn.execute("""
        CREATE TABLE IF NOT EXISTS product_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            filename TEXT,
            is_main INTEGER DEFAULT 0,
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    """)
    
    # Add is_main column if it doesn't exist (for existing databases)
    try:
        conn.execute("ALTER TABLE product_images ADD COLUMN is_main INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # Column already exists
    conn.execute("""
        CREATE TABLE IF NOT EXISTS product_sizes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            size TEXT,
            quantity INTEGER,
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
    
    # Add display_order column if it doesn't exist (for existing databases)
    try:
        conn.execute("ALTER TABLE categories ADD COLUMN display_order INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # Column already exists
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

def migrate_existing_products():
    """Set first image as main for existing products that don't have a main image"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get all products
    cursor.execute("SELECT id FROM products")
    products = cursor.fetchall()
    
    for product in products:
        product_id = product["id"]
        # Check if product has any main image
        cursor.execute("SELECT COUNT(*) as count FROM product_images WHERE product_id = ? AND is_main = 1", (product_id,))
        has_main = cursor.fetchone()["count"] > 0
        
        if not has_main:
            # Get first image for this product
            cursor.execute("SELECT id FROM product_images WHERE product_id = ? ORDER BY id ASC LIMIT 1", (product_id,))
            first_image = cursor.fetchone()
            if first_image:
                # Set it as main
                cursor.execute("UPDATE product_images SET is_main = 1 WHERE id = ?", (first_image["id"],))
    
    conn.commit()
    conn.close()

def migrate_categories_to_many_to_many():
    """Migrate existing single category field to many-to-many relationship"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if migration already done
    cursor.execute("SELECT COUNT(*) as count FROM product_categories")
    already_migrated = cursor.fetchone()["count"] > 0
    
    if already_migrated:
        conn.close()
        return
    
    # Get all products with categories
    cursor.execute("SELECT id, category FROM products WHERE category IS NOT NULL AND category != ''")
    products = cursor.fetchall()
    
    for product in products:
        product_id = product["id"]
        category_name = product["category"]
        
        if category_name:
            # Find or create category
            cursor.execute("SELECT id FROM categories WHERE name = ?", (category_name,))
            category = cursor.fetchone()
            
            if not category:
                # Create category if it doesn't exist
                cursor.execute("INSERT INTO categories (name) VALUES (?)", (category_name,))
                category_id = cursor.lastrowid
            else:
                category_id = category["id"]
            
            # Link product to category
            try:
                cursor.execute(
                    "INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)",
                    (product_id, category_id)
                )
            except sqlite3.IntegrityError:
                # Already exists, skip
                pass
    
    conn.commit()
    conn.close()

def initialize_category_display_order():
    """Initialize display_order for existing categories that don't have it set"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get all categories without display_order or with NULL display_order
    cursor.execute("SELECT id FROM categories WHERE display_order IS NULL")
    categories = cursor.fetchall()
    
    # Set display_order based on current id order (preserve existing order)
    for index, category in enumerate(categories):
        cursor.execute(
            "UPDATE categories SET display_order = ? WHERE id = ?",
            (index, category["id"])
        )
    
    conn.commit()
    conn.close()

setup_database()
migrate_existing_products()
migrate_categories_to_many_to_many()
initialize_category_display_order()

def verify_token(authorization: str = Header(...)):
    print("AUTH HEADER:", authorization)
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError("Invalid auth scheme")
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        print("Payload OK:", payload)
        return payload
    except Exception as e:
        print("Token error:", e)
        raise HTTPException(status_code=403, detail="Invalid or expired token")

# Data models
class Product(BaseModel):
    name: str
    price: int
    image: str
    quantity: int

def get_product_images(cursor, product_id):
    """Helper function to fetch product images sorted by is_main (main first)"""
    cursor.execute(
        "SELECT filename, is_main FROM product_images WHERE product_id = ? ORDER BY is_main DESC, id ASC",
        (product_id,)
    )
    image_rows = cursor.fetchall()
    images = [img["filename"] for img in image_rows]
    main_image = next((img["filename"] for img in image_rows if img["is_main"]), images[0] if images else None)
    return images, main_image

def get_product_categories(cursor, product_id):
    """Helper function to fetch product categories"""
    cursor.execute("""
        SELECT c.id, c.name 
        FROM categories c
        INNER JOIN product_categories pc ON c.id = pc.category_id
        WHERE pc.product_id = ?
        ORDER BY c.name
    """, (product_id,))
    category_rows = cursor.fetchall()
    return [{"id": cat["id"], "name": cat["name"]} for cat in category_rows]

def ensure_sale_price_from_discount(product_dict):
    """Ensure sale_price is calculated from discount_percent if discount_percent exists"""
    discount_percent = product_dict.get("discount_percent")
    price = product_dict.get("price")
    current_sale_price = product_dict.get("sale_price")
    
    # Convert discount_percent to int if it's a string or None
    if discount_percent is not None:
        try:
            discount_percent = int(discount_percent) if not isinstance(discount_percent, int) else discount_percent
        except (ValueError, TypeError):
            discount_percent = None
    
    # Convert price to int if needed
    if price is not None:
        try:
            price = int(price) if not isinstance(price, int) else price
        except (ValueError, TypeError):
            price = None
    
    # If discount_percent exists and is valid, recalculate sale_price
    if discount_percent is not None and discount_percent > 0 and price and price > 0:
        calculated_sale_price = int(price * (1 - discount_percent / 100))
        # Always use the calculated price if discount_percent is set
        if calculated_sale_price > 0 and calculated_sale_price < price:
            product_dict["sale_price"] = calculated_sale_price
        else:
            product_dict["sale_price"] = None
    # If no discount_percent but sale_price exists and is valid, keep it
    elif current_sale_price is not None:
        try:
            current_sale_price = int(current_sale_price) if not isinstance(current_sale_price, int) else current_sale_price
            if current_sale_price > 0 and price and current_sale_price < price:
                product_dict["sale_price"] = current_sale_price
            else:
                product_dict["sale_price"] = None
        except (ValueError, TypeError):
            product_dict["sale_price"] = None
    else:
        # No sale
        product_dict["sale_price"] = None
    
    return product_dict

@app.get("/products")
def read_products():
    conn = get_db()
    cursor = conn.cursor()

    # Fetch products
    cursor.execute("SELECT * FROM products")
    products = cursor.fetchall()

    result = []
    for product in products:
        product_dict = dict(product)

        # Fetch images for each product
        images, main_image = get_product_images(cursor, product["id"])
        product_dict["images"] = images
        product_dict["main_image"] = main_image

        # Fetch categories for each product
        categories = get_product_categories(cursor, product["id"])
        product_dict["categories"] = categories
        # Keep backward compatibility with single category field
        product_dict["category"] = categories[0]["name"] if categories else product_dict.get("category")

        # Ensure sale_price is calculated from discount_percent if needed
        product_dict = ensure_sale_price_from_discount(product_dict)

        result.append(product_dict)

    conn.close()
    return result

@app.get("/products/grouped/{category}")
def get_grouped_products(category: str):
    """Get products grouped by category with their variations"""
    conn = get_db()
    cursor = conn.cursor()

    # Fetch products in the category using the junction table
    cursor.execute("""
        SELECT DISTINCT p.* 
        FROM products p
        INNER JOIN product_categories pc ON p.id = pc.product_id
        INNER JOIN categories c ON pc.category_id = c.id
        WHERE c.name = ?
    """, (category,))
    products = cursor.fetchall()

    result = []
    for product in products:
        product_dict = dict(product)

        # Fetch images for each product
        images, main_image = get_product_images(cursor, product["id"])
        product_dict["images"] = images
        product_dict["main_image"] = main_image

        # Fetch categories for each product
        categories = get_product_categories(cursor, product["id"])
        product_dict["categories"] = categories
        # Keep backward compatibility with single category field
        product_dict["category"] = categories[0]["name"] if categories else product_dict.get("category")

        # Ensure sale_price is calculated from discount_percent if needed
        product_dict = ensure_sale_price_from_discount(product_dict)

        result.append(product_dict)

    conn.close()
    return result

@app.get("/products/category/{category}")
def get_products_by_category(category: str):
    """Get all products in a category"""
    conn = get_db()
    cursor = conn.cursor()

    # Fetch products in the category using the junction table
    cursor.execute("""
        SELECT DISTINCT p.* 
        FROM products p
        INNER JOIN product_categories pc ON p.id = pc.product_id
        INNER JOIN categories c ON pc.category_id = c.id
        WHERE c.name = ?
    """, (category,))
    products = cursor.fetchall()

    result = []
    for product in products:
        product_dict = dict(product)

        # Fetch images for each product
        images, main_image = get_product_images(cursor, product["id"])
        product_dict["images"] = images
        product_dict["main_image"] = main_image

        # Fetch categories for each product
        categories = get_product_categories(cursor, product["id"])
        product_dict["categories"] = categories
        # Keep backward compatibility with single category field
        product_dict["category"] = categories[0]["name"] if categories else product_dict.get("category")

        # Ensure sale_price is calculated from discount_percent if needed
        product_dict = ensure_sale_price_from_discount(product_dict)

        result.append(product_dict)

    conn.close()
    return result

# Category management endpoints
@app.get("/categories")
def get_categories():
    """Get all categories ordered by display_order"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM categories ORDER BY display_order ASC, id ASC")
    categories = cursor.fetchall()
    conn.close()
    return [dict(cat) for cat in categories]

@app.get("/categories/{category_name}")
def get_category(category_name: str):
    """Get a specific category by name"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM categories WHERE name = ?", (category_name,))
    category = cursor.fetchone()
    conn.close()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return dict(category)

@app.post("/categories")
def create_category(
    name: str = Form(...),
    image: Optional[UploadFile] = File(None),
    auth=Depends(verify_token),
):
    """Create or update a category"""
    conn = get_db()
    cursor = conn.cursor()
    
    image_filename = None
    if image and image.filename:
        # Read and optimize category image
        original_bytes = image.file.read()
        optimized_bytes = optimize_image(original_bytes, max_size=(1920, 1920), quality=85)
        
        base_filename = f"{uuid.uuid4()}_{image.filename}"
        image_filename = os.path.splitext(base_filename)[0] + ".jpg"
        image_path = os.path.join(UPLOAD_DIR, image_filename)
        with open(image_path, "wb") as buffer:
            buffer.write(optimized_bytes)
    
    # Check if category exists
    cursor.execute("SELECT id FROM categories WHERE name = ?", (name,))
    existing = cursor.fetchone()
    
    if existing:
        # Update existing category
        if image_filename:
            cursor.execute(
                "UPDATE categories SET image_filename = ? WHERE name = ?",
                (image_filename, name)
            )
    else:
        # Create new category
        cursor.execute(
            "INSERT INTO categories (name, image_filename) VALUES (?, ?)",
            (name, image_filename)
        )
    
    conn.commit()
    conn.close()
    return {"message": "Category created/updated", "name": name}

@app.put("/categories/{category_id}")
def update_category(
    category_id: int,
    name: str = Form(...),
    image: Optional[UploadFile] = File(None),
    auth=Depends(verify_token),
):
    """Update a category by ID"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if category exists
    cursor.execute("SELECT * FROM categories WHERE id = ?", (category_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Handle image update
    image_filename = existing["image_filename"]  # Keep existing image by default
    if image and image.filename:
        # Delete old image if it exists
        if existing["image_filename"]:
            old_image_path = os.path.join(UPLOAD_DIR, existing["image_filename"])
            if os.path.exists(old_image_path):
                os.remove(old_image_path)
        
        # Read and optimize new image
        original_bytes = image.file.read()
        optimized_bytes = optimize_image(original_bytes, max_size=(1920, 1920), quality=85)
        
        base_filename = f"{uuid.uuid4()}_{image.filename}"
        image_filename = os.path.splitext(base_filename)[0] + ".jpg"
        image_path = os.path.join(UPLOAD_DIR, image_filename)
        with open(image_path, "wb") as buffer:
            buffer.write(optimized_bytes)
    
    # Update category
    cursor.execute(
        "UPDATE categories SET name = ?, image_filename = ? WHERE id = ?",
        (name, image_filename, category_id)
    )
    
    conn.commit()
    conn.close()
    return {"message": "Category updated", "id": category_id, "name": name}

@app.post("/categories/reorder")
def reorder_categories(
    category_orders: dict = Body(...),
    auth=Depends(verify_token),
):
    """Update the display order of categories"""
    conn = get_db()
    cursor = conn.cursor()
    
    # category_orders should be a dict like {category_id: display_order, ...}
    for category_id, display_order in category_orders.items():
        try:
            category_id_int = int(category_id)
            display_order_int = int(display_order)
            cursor.execute(
                "UPDATE categories SET display_order = ? WHERE id = ?",
                (display_order_int, category_id_int)
            )
        except (ValueError, TypeError):
            continue  # Skip invalid entries
    
    conn.commit()
    conn.close()
    return {"message": "Category order updated"}

@app.delete("/categories/{category_name}")
def delete_category(category_name: str, auth=Depends(verify_token)):
    """Delete a category"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get category image to delete it
    cursor.execute("SELECT image_filename FROM categories WHERE name = ?", (category_name,))
    category = cursor.fetchone()
    
    if category and category["image_filename"]:
        image_path = os.path.join(UPLOAD_DIR, category["image_filename"])
        if os.path.exists(image_path):
            os.remove(image_path)
    
    cursor.execute("DELETE FROM categories WHERE name = ?", (category_name,))
    conn.commit()
    conn.close()
    return {"message": "Category deleted", "name": category_name}

@app.get("/products/{product_id}")
def get_product(product_id: int):
    conn = get_db()
    cursor = conn.cursor()

    # Fetch product
    product = cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
    if not product:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found")

    # Fetch related images
    images, main_image = get_product_images(cursor, product_id)
    
    # Fetch categories
    categories = get_product_categories(cursor, product_id)
    
    conn.close()

    product_dict = dict(product)
    product_dict["images"] = images
    product_dict["main_image"] = main_image
    product_dict["categories"] = categories
    # Keep backward compatibility with single category field
    product_dict["category"] = categories[0]["name"] if categories else product_dict.get("category")

    # Ensure sale_price is calculated from discount_percent if needed
    product_dict = ensure_sale_price_from_discount(product_dict)

    return product_dict

@app.get("/sitemap.xml")
def get_sitemap():
    conn = get_db()
    cursor = conn.cursor()
    
    # Get current date for lastmod
    current_date = datetime.now().strftime('%Y-%m-%d')
    
    # Get all products
    cursor.execute("SELECT id, name FROM products")
    products = cursor.fetchall()
    
    # Get all categories
    cursor.execute("SELECT name FROM categories")
    categories = cursor.fetchall()
    
    conn.close()
    
    # Generate sitemap XML
    sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n'
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    # Homepage
    sitemap += '  <url>\n'
    sitemap += '    <loc>https://yakimoto.se</loc>\n'
    sitemap += f'    <lastmod>{current_date}</lastmod>\n'
    sitemap += '    <changefreq>weekly</changefreq>\n'
    sitemap += '    <priority>1.0</priority>\n'
    sitemap += '  </url>\n'
    
    # Category pages
    for category in categories:
        category_name = category["name"]
        sitemap += '  <url>\n'
        sitemap += f'    <loc>https://yakimoto.se/category/{category_name}</loc>\n'
        sitemap += f'    <lastmod>{current_date}</lastmod>\n'
        sitemap += '    <changefreq>weekly</changefreq>\n'
        sitemap += '    <priority>0.9</priority>\n'
        sitemap += '  </url>\n'
    
    # Product pages
    for product in products:
        sitemap += '  <url>\n'
        sitemap += f'    <loc>https://yakimoto.se/products/{product["id"]}</loc>\n'
        sitemap += f'    <lastmod>{current_date}</lastmod>\n'
        sitemap += '    <changefreq>monthly</changefreq>\n'
        sitemap += '    <priority>0.8</priority>\n'
        sitemap += '  </url>\n'
    
    # Cart and checkout pages (lower priority)
    sitemap += '  <url>\n'
    sitemap += '    <loc>https://yakimoto.se/cart</loc>\n'
    sitemap += f'    <lastmod>{current_date}</lastmod>\n'
    sitemap += '    <changefreq>monthly</changefreq>\n'
    sitemap += '    <priority>0.3</priority>\n'
    sitemap += '  </url>\n'
    
    sitemap += '  <url>\n'
    sitemap += '    <loc>https://yakimoto.se/checkout</loc>\n'
    sitemap += f'    <lastmod>{current_date}</lastmod>\n'
    sitemap += '    <changefreq>monthly</changefreq>\n'
    sitemap += '    <priority>0.3</priority>\n'
    sitemap += '  </url>\n'
    
    sitemap += '</urlset>'
    
    return Response(content=sitemap, media_type="application/xml")

@app.post("/products")
def create_product(
    name: str = Form(...),
    price: int = Form(...),
    sizes: str = Form(...),
    images: List[UploadFile] = File(...),
    category: str = Form(None),
    color: str = Form(None),
    gsm: str = Form(None),
    age_group: str = Form(None),
    description: str = Form(None),
    sale_price: str = Form(None),
    discount_percent: str = Form(None),
    category_ids: str = Form(None),  # Comma-separated category IDs
    auth=Depends(verify_token),
):
    conn = get_db()
    cursor = conn.cursor()

    # Calculate sale_price from discount_percent if provided
    # Handle empty strings and convert to None
    discount_percent_val = None
    if discount_percent is not None and discount_percent != "":
        try:
            discount_percent_val = int(discount_percent)
        except (ValueError, TypeError):
            discount_percent_val = None
    
    sale_price_val = None
    if sale_price is not None and sale_price != "":
        try:
            sale_price_val = int(sale_price)
        except (ValueError, TypeError):
            sale_price_val = None
    
    final_sale_price = None
    discount_percent_to_save = None
    if discount_percent_val is not None and discount_percent_val > 0:
        # Calculate sale price from percentage discount
        final_sale_price = int(price * (1 - discount_percent_val / 100))
        discount_percent_to_save = discount_percent_val
    elif sale_price_val is not None and sale_price_val > 0:
        # Use provided sale_price directly
        final_sale_price = sale_price_val
        discount_percent_to_save = None
    else:
        final_sale_price = None
        discount_percent_to_save = None

    # Insert product (without image column)
    cursor.execute(
        "INSERT INTO products (name, price, sizes, category, color, gsm, age_group, description, sale_price, discount_percent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (name, price, sizes, category, color, gsm, age_group, description, final_sale_price, discount_percent_to_save)
    )
    product_id = cursor.lastrowid

    # Handle multiple categories
    if category_ids:
        category_id_list = [int(cid.strip()) for cid in category_ids.split(',') if cid.strip()]
        for cat_id in category_id_list:
            try:
                cursor.execute(
                    "INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)",
                    (product_id, cat_id)
                )
            except sqlite3.IntegrityError:
                # Already exists, skip
                pass
    # Backward compatibility: if old category field is provided, use it
    elif category:
        cursor.execute("SELECT id FROM categories WHERE name = ?", (category,))
        cat = cursor.fetchone()
        if cat:
            try:
                cursor.execute(
                    "INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)",
                    (product_id, cat["id"])
                )
            except sqlite3.IntegrityError:
                pass

    # Save images - set first image as main
    for idx, image in enumerate(images):
        # Read original image
        original_bytes = image.file.read()
        
        # Optimize main image (max 1920x1920, quality 85)
        optimized_bytes = optimize_image(original_bytes, max_size=(1920, 1920), quality=85)
        
        # Create thumbnail (400x400, quality 80)
        thumbnail_bytes = create_thumbnail(original_bytes, size=(400, 400), quality=80)
        
        # Generate filenames
        base_filename = f"{uuid.uuid4()}_{image.filename}"
        # Change extension to .jpg for optimized images
        filename = os.path.splitext(base_filename)[0] + ".jpg"
        thumbnail_filename = os.path.splitext(base_filename)[0] + "_thumb.jpg"
        
        # Save optimized main image
        image_path = os.path.join(UPLOAD_DIR, filename)
        with open(image_path, "wb") as buffer:
            buffer.write(optimized_bytes)
        
        # Save thumbnail
        thumbnail_path = os.path.join(THUMBNAIL_DIR, thumbnail_filename)
        with open(thumbnail_path, "wb") as buffer:
            buffer.write(thumbnail_bytes)

        # Link image to product - first image is main
        is_main = 1 if idx == 0 else 0
        cursor.execute(
            "INSERT INTO product_images (product_id, filename, is_main) VALUES (?, ?, ?)",
            (product_id, filename, is_main)
        )

    # Handle multiple categories
    if category_ids:
        category_id_list = [int(cid.strip()) for cid in category_ids.split(',') if cid.strip()]
        for cat_id in category_id_list:
            try:
                cursor.execute(
                    "INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)",
                    (product_id, cat_id)
                )
            except sqlite3.IntegrityError:
                # Already exists, skip
                pass
    # Backward compatibility: if old category field is provided, use it
    elif category:
        cursor.execute("SELECT id FROM categories WHERE name = ?", (category,))
        cat = cursor.fetchone()
        if cat:
            try:
                cursor.execute(
                    "INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)",
                    (product_id, cat["id"])
                )
            except sqlite3.IntegrityError:
                pass

    conn.commit()
    conn.close()

    return {"message": "Product created", "id": product_id}

@app.put("/products/{product_id}")
async def update_product(
    product_id: int,
    request: Request,
    name: str = Form(...),
    price: float = Form(...),
    sizes: str = Form(...),
    category: str = Form(None),
    color: str = Form(None),
    gsm: str = Form(None),
    age_group: str = Form(None),
    description: str = Form(None),
    sale_price: int = Form(None),
    discount_percent: int = Form(None),
    category_ids: str = Form(None),  # Comma-separated category IDs
    auth=Depends(verify_token),
):
    conn = get_db()
    cursor = conn.cursor()
    
    # Calculate sale_price from discount_percent if provided
    # Handle empty strings and convert to None
    discount_percent_val = None
    if discount_percent is not None and discount_percent != "":
        try:
            discount_percent_val = int(discount_percent)
        except (ValueError, TypeError):
            discount_percent_val = None
    
    sale_price_val = None
    if sale_price is not None and sale_price != "":
        try:
            sale_price_val = int(sale_price)
        except (ValueError, TypeError):
            sale_price_val = None
    
    final_sale_price = None
    discount_percent_to_save = None
    if discount_percent_val is not None and discount_percent_val > 0:
        # Calculate sale price from percentage discount
        final_sale_price = int(price * (1 - discount_percent_val / 100))
        discount_percent_to_save = discount_percent_val
    elif sale_price_val is not None and sale_price_val > 0:
        # Use provided sale_price directly
        final_sale_price = sale_price_val
        discount_percent_to_save = None
    else:
        final_sale_price = None
        discount_percent_to_save = None
    
    # Update product basic info
    cursor.execute(
        "UPDATE products SET name = ?, price = ?, sizes = ?, category = ?, color = ?, gsm = ?, age_group = ?, description = ?, sale_price = ?, discount_percent = ? WHERE id = ?",
        (name, price, sizes, category, color, gsm, age_group, description, final_sale_price, discount_percent_to_save, product_id),
    )
    
    # Update categories - remove old ones and add new ones
    cursor.execute("DELETE FROM product_categories WHERE product_id = ?", (product_id,))
    
    if category_ids:
        category_id_list = [int(cid.strip()) for cid in category_ids.split(',') if cid.strip()]
        for cat_id in category_id_list:
            try:
                cursor.execute(
                    "INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)",
                    (product_id, cat_id)
                )
            except sqlite3.IntegrityError:
                pass
    # Backward compatibility: if old category field is provided, use it
    elif category:
        cursor.execute("SELECT id FROM categories WHERE name = ?", (category,))
        cat = cursor.fetchone()
        if cat:
            try:
                cursor.execute(
                    "INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)",
                    (product_id, cat["id"])
                )
            except sqlite3.IntegrityError:
                pass
    
    # Handle new images if provided - parse form data manually to handle optional files
    form = await request.form()
    if "images" in form:
        images = form.getlist("images")
        # Check if product already has a main image
        cursor.execute("SELECT COUNT(*) as count FROM product_images WHERE product_id = ? AND is_main = 1", (product_id,))
        has_main = cursor.fetchone()["count"] > 0
        
        for idx, image in enumerate(images):
            # Check if it's actually a file upload (not just a string)
            if hasattr(image, 'filename') and image.filename:
                # Read original image
                original_bytes = await image.read()
                
                # Optimize main image (max 1920x1920, quality 85)
                optimized_bytes = optimize_image(original_bytes, max_size=(1920, 1920), quality=85)
                
                # Create thumbnail (400x400, quality 80)
                thumbnail_bytes = create_thumbnail(original_bytes, size=(400, 400), quality=80)
                
                # Generate filenames
                base_filename = f"{uuid.uuid4()}_{image.filename}"
                # Change extension to .jpg for optimized images
                filename = os.path.splitext(base_filename)[0] + ".jpg"
                thumbnail_filename = os.path.splitext(base_filename)[0] + "_thumb.jpg"
                
                # Save optimized main image
                image_path = os.path.join(UPLOAD_DIR, filename)
                with open(image_path, "wb") as buffer:
                    buffer.write(optimized_bytes)
                
                # Save thumbnail
                thumbnail_path = os.path.join(THUMBNAIL_DIR, thumbnail_filename)
                with open(thumbnail_path, "wb") as buffer:
                    buffer.write(thumbnail_bytes)

                # Link image to product - set as main if no main exists and this is the first new image
                is_main = 1 if (not has_main and idx == 0) else 0
                cursor.execute(
                    "INSERT INTO product_images (product_id, filename, is_main) VALUES (?, ?, ?)",
                    (product_id, filename, is_main)
                )
    
    conn.commit()
    conn.close()
    return {"message": "Product updated"}

@app.post("/products/{product_id}/set-main-image")
def set_main_image(
    product_id: int,
    filename: str = Form(...),
    auth=Depends(verify_token),
):
    """Set which image is the main image for a product"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify the image belongs to this product
    cursor.execute(
        "SELECT id FROM product_images WHERE product_id = ? AND filename = ?",
        (product_id, filename)
    )
    image = cursor.fetchone()
    if not image:
        conn.close()
        raise HTTPException(status_code=404, detail="Image not found for this product")
    
    # Unset all main images for this product
    cursor.execute(
        "UPDATE product_images SET is_main = 0 WHERE product_id = ?",
        (product_id,)
    )
    
    # Set the specified image as main
    cursor.execute(
        "UPDATE product_images SET is_main = 1 WHERE product_id = ? AND filename = ?",
        (product_id, filename)
    )
    
    conn.commit()
    conn.close()
    return {"message": "Main image updated", "filename": filename}

@app.delete("/products/{product_id}/images/{filename}")
def delete_product_image(
    product_id: int,
    filename: str,
    auth=Depends(verify_token),
):
    """Delete an image from a product"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify the image belongs to this product
    cursor.execute(
        "SELECT id, is_main FROM product_images WHERE product_id = ? AND filename = ?",
        (product_id, filename)
    )
    image = cursor.fetchone()
    if not image:
        conn.close()
        raise HTTPException(status_code=404, detail="Image not found for this product")
    
    was_main = image["is_main"] == 1
    
    # Delete the image file from disk
    image_path = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(image_path):
        try:
            os.remove(image_path)
        except Exception as e:
            print(f"Error deleting image file {image_path}: {e}")
    
    # Delete the thumbnail if it exists
    base_name = os.path.splitext(filename)[0]
    thumbnail_filename = f"{base_name}_thumb.jpg"
    thumbnail_path = os.path.join(THUMBNAIL_DIR, thumbnail_filename)
    if os.path.exists(thumbnail_path):
        try:
            os.remove(thumbnail_path)
        except Exception as e:
            print(f"Error deleting thumbnail {thumbnail_path}: {e}")
    
    # Remove the image record from database
    cursor.execute(
        "DELETE FROM product_images WHERE product_id = ? AND filename = ?",
        (product_id, filename)
    )
    
    # If this was the main image, set another image as main (if any exist)
    if was_main:
        cursor.execute(
            "SELECT id FROM product_images WHERE product_id = ? ORDER BY id ASC LIMIT 1",
            (product_id,)
        )
        next_image = cursor.fetchone()
        if next_image:
            cursor.execute(
                "UPDATE product_images SET is_main = 1 WHERE id = ?",
                (next_image["id"],)
            )
    
    conn.commit()
    conn.close()
    return {"message": "Image deleted", "filename": filename}

@app.delete("/products/{product_id}")
def delete_product(product_id: int, auth=Depends(verify_token)):
    conn = get_db()
    conn.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    conn.close()
    return {"message": "Product deleted", "id": product_id}

@app.get("/admin/thumbnail-status")
def get_thumbnail_status(auth=Depends(verify_token)):
    """Check thumbnail status for all images"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get all image filenames from database
    cursor.execute("SELECT DISTINCT filename FROM product_images")
    product_images = [row["filename"] for row in cursor.fetchall()]
    
    cursor.execute("SELECT DISTINCT image_filename FROM categories WHERE image_filename IS NOT NULL")
    category_images = [row["image_filename"] for row in cursor.fetchall()]
    
    all_images = set(product_images + category_images)
    
    status = {
        "with_thumbnails": [],
        "without_thumbnails": [],
        "missing_originals": [],
        "total": len(all_images),
        "thumbnail_count": 0,
        "missing_count": 0
    }
    
    for filename in all_images:
        if not filename:
            continue
        
        # Check if original image exists
        image_path = os.path.join(UPLOAD_DIR, filename)
        if not os.path.exists(image_path):
            status["missing_originals"].append(filename)
            status["missing_count"] += 1
            continue
        
        # Check if thumbnail exists
        base_name = os.path.splitext(filename)[0]
        thumbnail_filename = f"{base_name}_thumb.jpg"
        thumbnail_path = os.path.join(THUMBNAIL_DIR, thumbnail_filename)
        
        if os.path.exists(thumbnail_path):
            status["with_thumbnails"].append(filename)
            status["thumbnail_count"] += 1
        else:
            status["without_thumbnails"].append(filename)
    
    conn.close()
    
    return status

@app.post("/admin/delete-thumbnails")
def delete_all_thumbnails(auth=Depends(verify_token)):
    """Delete all thumbnails (useful for regenerating with correct orientation)"""
    deleted = 0
    errors = []
    
    try:
        # Get all thumbnail files
        if os.path.exists(THUMBNAIL_DIR):
            for filename in os.listdir(THUMBNAIL_DIR):
                if filename.endswith('_thumb.jpg'):
                    try:
                        thumbnail_path = os.path.join(THUMBNAIL_DIR, filename)
                        os.remove(thumbnail_path)
                        deleted += 1
                    except Exception as e:
                        errors.append(f"Error deleting {filename}: {str(e)}")
    except Exception as e:
        errors.append(f"Error accessing thumbnails directory: {str(e)}")
    
    return {
        "message": "Thumbnail deletion completed",
        "deleted": deleted,
        "errors": errors
    }

@app.post("/admin/generate-thumbnails")
def generate_thumbnails_for_existing_images(auth=Depends(verify_token)):
    """Generate thumbnails for all existing images that don't have thumbnails yet"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get all image filenames from database
    cursor.execute("SELECT DISTINCT filename FROM product_images")
    product_images = [row["filename"] for row in cursor.fetchall()]
    
    cursor.execute("SELECT DISTINCT image_filename FROM categories WHERE image_filename IS NOT NULL")
    category_images = [row["image_filename"] for row in cursor.fetchall()]
    
    all_images = set(product_images + category_images)
    
    processed = 0
    skipped = 0
    errors = []
    
    for filename in all_images:
        if not filename:
            continue
            
        # Skip if thumbnail already exists
        base_name = os.path.splitext(filename)[0]
        thumbnail_filename = f"{base_name}_thumb.jpg"
        thumbnail_path = os.path.join(THUMBNAIL_DIR, thumbnail_filename)
        
        if os.path.exists(thumbnail_path):
            skipped += 1
            continue
        
        # Check if original image exists
        image_path = os.path.join(UPLOAD_DIR, filename)
        if not os.path.exists(image_path):
            errors.append(f"Original image not found: {filename}")
            continue
        
        try:
            # Read original image
            with open(image_path, "rb") as f:
                original_bytes = f.read()
            
            # Create thumbnail
            thumbnail_bytes = create_thumbnail(original_bytes, size=(400, 400), quality=80)
            
            # Save thumbnail
            with open(thumbnail_path, "wb") as f:
                f.write(thumbnail_bytes)
            
            processed += 1
        except Exception as e:
            errors.append(f"Error processing {filename}: {str(e)}")
    
    conn.close()
    
    return {
        "message": "Thumbnail generation completed",
        "processed": processed,
        "skipped": skipped,
        "errors": errors,
        "total": len(all_images)
    }

@app.post("/login")
def login(password: str = Form(...)):
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized")

    payload = {
        "sub": "admin",
        "exp": time.time() + JWT_EXP_DELTA_SECONDS
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {"token": token}

import json  # ensure at top of file

import json  # Ensure this is imported at the top

@app.post("/checkout")
def create_order(order: dict = Body(...)):
    print("Received order:", order)

    customer = order.get("customer", {})
    items = order.get("items", [])
    payment = customer.get("payment") or order.get("payment")

    # Handle different payment methods
    payment_display = payment
    if payment == "stripe":
        payment_display = "Stripe (Betalning genomförd)"
    elif payment == "swish":
        payment_display = "Swish"
    elif payment == "bankgiro":
        payment_display = "Bankgiro"

    # Compose email
    body = f"Ny beställning från {customer.get('firstName', '')} {customer.get('lastName', '')}\n\n"
    body += f"E-post: {customer.get('email', '')}\nTelefon: {customer.get('phone', '')}\nBetalning: {payment_display}\n\n"
    body += "Produkter:\n"
    for item in items:
        color = item.get('color', '')
        color_str = f" ({color})" if color else ""
        body += f"- {item.get('name')}{color_str} ({item.get('selectedSize')}) x{item.get('quantity')} – {item.get('price')} kr\n"


    msg = MIMEMultipart()
    msg["From"] = os.getenv("SMTP_USER")
    msg["To"] = os.getenv("EMAIL_RECEIVER")
    msg["Subject"] = f"Ny beställning på Yakimoto Dojo ({payment_display})"
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(os.getenv("SMTP_SERVER"), int(os.getenv("SMTP_PORT"))) as server:
            server.starttls()
            server.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD"))
            server.send_message(msg)
            print("Email sent.")
    except Exception as e:
        print("Failed to send email:", e)
        raise HTTPException(status_code=500, detail="Failed to send email")

    # 🔽 Update stock levels in the database
    conn = get_db()
    cursor = conn.cursor()

    for item in items:
        product_id = item["id"]
        size = str(item["selectedSize"])
        quantity = int(item["quantity"])

        cursor.execute("SELECT sizes FROM products WHERE id = ?", (product_id,))
        row = cursor.fetchone()
        if not row:
            continue

        sizes = json.loads(row["sizes"])
        if size in sizes:
            sizes[size] = max(0, sizes[size] - quantity)

        updated_sizes = json.dumps(sizes)
        cursor.execute("UPDATE products SET sizes = ? WHERE id = ?", (updated_sizes, product_id))

    conn.commit()
    conn.close()

    return {"message": "Order received, email sent, and stock updated"}

@app.get("/stripe-publishable-key")
def get_stripe_publishable_key():
    """Get Stripe publishable key for frontend"""
    if not STRIPE_PUBLISHABLE_KEY:
        raise HTTPException(status_code=500, detail="Stripe publishable key not configured")
    return {"publishable_key": STRIPE_PUBLISHABLE_KEY}

@app.post("/create-payment-intent")
def create_payment_intent(order: dict = Body(...)):
    try:
        # Calculate total amount in cents (Stripe uses smallest currency unit)
        total_amount = int(order.get("total", 0) * 100)
        
        # Create payment intent
        intent = stripe.PaymentIntent.create(
            amount=total_amount,
            currency='sek',  # Swedish Krona
            automatic_payment_methods={
                'enabled': True,
            },
            metadata={
                'customer_email': order.get("customer", {}).get("email", ""),
                'customer_name': f"{order.get('customer', {}).get('firstName', '')} {order.get('customer', {}).get('lastName', '')}",
                'items': str(len(order.get("items", [])))
            }
        )
        
        return {
            "client_secret": intent.client_secret,
            "publishable_key": STRIPE_PUBLISHABLE_KEY
        }
    except Exception as e:
        print(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create payment intent")

@app.post("/confirm-payment")
def confirm_payment(payment_data: dict = Body(...)):
    try:
        payment_intent_id = payment_data.get("payment_intent_id")
        order = payment_data.get("order")
        
        # Verify payment intent
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if intent.status != "succeeded":
            raise HTTPException(status_code=400, detail="Payment not completed")
        
        # Process the order (same as regular checkout)
        customer = order.get("customer", {})
        items = order.get("items", [])
        
        # Compose email
        body = f"Ny beställning från {customer.get('firstName', '')} {customer.get('lastName', '')}\n\n"
        body += f"E-post: {customer.get('email', '')}\nTelefon: {customer.get('phone', '')}\nBetalning: Stripe (Betalning genomförd)\n\n"
        body += "Produkter:\n"
        for item in items:
            color = item.get('color', '')
            color_str = f" ({color})" if color else ""
            body += f"- {item.get('name')}{color_str} ({item.get('selectedSize')}) x{item.get('quantity')} – {item.get('price')} kr\n"

        msg = MIMEMultipart()
        msg["From"] = os.getenv("SMTP_USER")
        msg["To"] = os.getenv("EMAIL_RECEIVER")
        msg["Subject"] = "Ny beställning på Yakimoto Dojo (Stripe betalning)"
        msg.attach(MIMEText(body, "plain"))

        try:
            with smtplib.SMTP(os.getenv("SMTP_SERVER"), int(os.getenv("SMTP_PORT"))) as server:
                server.starttls()
                server.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD"))
                server.send_message(msg)
                print("Email sent.")
        except Exception as e:
            print("Failed to send email:", e)
            raise HTTPException(status_code=500, detail="Failed to send email")

        # Update stock levels in the database
        conn = get_db()
        cursor = conn.cursor()

        for item in items:
            product_id = item["id"]
            size = str(item["selectedSize"])
            quantity = int(item["quantity"])

            cursor.execute("SELECT sizes FROM products WHERE id = ?", (product_id,))
            row = cursor.fetchone()
            if not row:
                continue

            sizes = json.loads(row["sizes"])
            if size in sizes:
                sizes[size] = max(0, sizes[size] - quantity)

            updated_sizes = json.dumps(sizes)
            cursor.execute("UPDATE products SET sizes = ? WHERE id = ?", (updated_sizes, product_id))

        conn.commit()
        conn.close()

        return {"message": "Payment confirmed and order processed"}
        
    except Exception as e:
        print(f"Payment confirmation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to confirm payment")
