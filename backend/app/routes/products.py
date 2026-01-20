"""
Product management endpoints.
"""
import json
import os
import sqlite3
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile

from ..config import settings
from ..database import get_db
from ..dependencies import verify_token
from ..services.image import ImageService
from ..services.inventory import normalize_sizes, move_between_locations


router = APIRouter(prefix="/products", tags=["products"])


def get_product_images(cursor, product_id: int) -> tuple:
    cursor.execute(
        "SELECT filename, is_main FROM product_images WHERE product_id = ? ORDER BY is_main DESC, id ASC",
        (product_id,)
    )
    image_rows = cursor.fetchall()
    images = [img["filename"] for img in image_rows]
    main_image = next(
        (img["filename"] for img in image_rows if img["is_main"]),
        images[0] if images else None
    )
    return images, main_image


def get_product_categories(cursor, product_id: int) -> list:
    cursor.execute("""
        SELECT c.id, c.name 
        FROM categories c
        INNER JOIN product_categories pc ON c.id = pc.category_id
        WHERE pc.product_id = ?
        ORDER BY c.name
    """, (product_id,))
    category_rows = cursor.fetchall()
    return [{"id": cat["id"], "name": cat["name"]} for cat in category_rows]


def ensure_sale_price_from_discount(product_dict: dict) -> dict:
    discount_percent = product_dict.get("discount_percent")
    price = product_dict.get("price")
    current_sale_price = product_dict.get("sale_price")
    
    if discount_percent is not None:
        try:
            discount_percent = int(discount_percent) if not isinstance(discount_percent, int) else discount_percent
        except (ValueError, TypeError):
            discount_percent = None
    
    if price is not None:
        try:
            price = int(price) if not isinstance(price, int) else price
        except (ValueError, TypeError):
            price = None
    
    if discount_percent is not None and discount_percent > 0 and price and price > 0:
        calculated_sale_price = int(price * (1 - discount_percent / 100))
        if calculated_sale_price > 0 and calculated_sale_price < price:
            product_dict["sale_price"] = calculated_sale_price
        else:
            product_dict["sale_price"] = None
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
        product_dict["sale_price"] = None
    
    return product_dict


def build_product_response(cursor, product) -> dict:
    product_dict = dict(product)
    
    # Normalize sizes
    if product_dict.get("sizes"):
        try:
            sizes_parsed = json.loads(product_dict["sizes"]) if isinstance(product_dict["sizes"], str) else product_dict["sizes"]
            product_dict["sizes"] = json.dumps(normalize_sizes(sizes_parsed))
        except (json.JSONDecodeError, TypeError):
            pass
    
    # Fetch images
    images, main_image = get_product_images(cursor, product["id"])
    product_dict["images"] = images
    product_dict["main_image"] = main_image
    
    # Fetch categories
    categories = get_product_categories(cursor, product["id"])
    product_dict["categories"] = categories
    product_dict["category"] = categories[0]["name"] if categories else product_dict.get("category")
    
    # Ensure sale price
    product_dict = ensure_sale_price_from_discount(product_dict)
    
    return product_dict


@router.get("")
def read_products():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products")
    products = cursor.fetchall()
    
    result = [build_product_response(cursor, product) for product in products]
    
    conn.close()
    return result


@router.get("/grouped/{category}")
def get_grouped_products(category: str):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT DISTINCT p.* 
        FROM products p
        INNER JOIN product_categories pc ON p.id = pc.product_id
        INNER JOIN categories c ON pc.category_id = c.id
        WHERE c.name = ?
    """, (category,))
    products = cursor.fetchall()
    
    result = [build_product_response(cursor, product) for product in products]
    
    conn.close()
    return result


@router.get("/category/{category}")
def get_products_by_category(category: str):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT DISTINCT p.* 
        FROM products p
        INNER JOIN product_categories pc ON p.id = pc.product_id
        INNER JOIN categories c ON pc.category_id = c.id
        WHERE c.name = ?
    """, (category,))
    products = cursor.fetchall()
    
    result = [build_product_response(cursor, product) for product in products]
    
    conn.close()
    return result


@router.get("/{product_id}")
def get_product(product_id: int):
    conn = get_db()
    cursor = conn.cursor()
    
    product = cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
    if not product:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found")
    
    result = build_product_response(cursor, product)
    
    conn.close()
    return result


def calculate_sale_price(price: int, sale_price: Optional[str], discount_percent: Optional[str]) -> tuple:
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
    
    if discount_percent_val is not None and discount_percent_val > 0:
        return int(price * (1 - discount_percent_val / 100)), discount_percent_val
    elif sale_price_val is not None and sale_price_val > 0:
        return sale_price_val, None
    return None, None


def link_product_categories(cursor, product_id: int, category_ids: Optional[str], category: Optional[str]):
    # Parse category_ids string (can be empty string, None, or comma-separated IDs)
    print(f"link_product_categories: product_id={product_id}, category_ids='{category_ids}', category='{category}'")
    
    if category_ids is not None and category_ids.strip():
        category_id_list = [int(cid.strip()) for cid in category_ids.split(',') if cid.strip()]
        print(f"Inserting category_ids: {category_id_list}")
        for cat_id in category_id_list:
            try:
                cursor.execute(
                    "INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)",
                    (product_id, cat_id)
                )
                print(f"Inserted product_categories: ({product_id}, {cat_id})")
            except sqlite3.IntegrityError as e:
                print(f"IntegrityError inserting ({product_id}, {cat_id}): {e}")
    elif category_ids is None and category:
        # Fallback to legacy category field only if category_ids was not provided at all
        print(f"Fallback to legacy category: {category}")
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
    else:
        print("No categories to link")


@router.post("")
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
    category_ids: str = Form(None),
    auth=Depends(verify_token),
):
    conn = get_db()
    cursor = conn.cursor()
    
    # Calculate sale price
    final_sale_price, discount_percent_to_save = calculate_sale_price(
        price, sale_price, discount_percent
    )
    
    # Normalize sizes
    try:
        sizes_parsed = json.loads(sizes) if isinstance(sizes, str) else sizes
        sizes = json.dumps(normalize_sizes(sizes_parsed))
    except (json.JSONDecodeError, TypeError):
        pass
    
    # Insert product
    cursor.execute(
        """INSERT INTO products 
           (name, price, sizes, category, color, gsm, age_group, description, sale_price, discount_percent) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (name, price, sizes, category, color, gsm, age_group, description, final_sale_price, discount_percent_to_save)
    )
    product_id = cursor.lastrowid
    
    # Link categories
    link_product_categories(cursor, product_id, category_ids, category)
    
    # Save images
    for idx, image in enumerate(images):
        original_bytes = image.file.read()
        filename, _ = ImageService.save_product_image(original_bytes, image.filename)
        
        is_main = 1 if idx == 0 else 0
        cursor.execute(
            "INSERT INTO product_images (product_id, filename, is_main) VALUES (?, ?, ?)",
            (product_id, filename, is_main)
        )
    
    conn.commit()
    conn.close()
    
    return {"message": "Product created", "id": product_id}


@router.put("/{product_id}")
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
    category_ids: str = Form(None),
    auth=Depends(verify_token),
):
    conn = get_db()
    cursor = conn.cursor()
    
    # Calculate sale price
    final_sale_price, discount_percent_to_save = calculate_sale_price(
        int(price), str(sale_price) if sale_price else None, str(discount_percent) if discount_percent else None
    )
    
    # Normalize sizes
    try:
        sizes_parsed = json.loads(sizes) if isinstance(sizes, str) else sizes
        sizes = json.dumps(normalize_sizes(sizes_parsed))
    except (json.JSONDecodeError, TypeError):
        pass
    
    # Update product
    cursor.execute(
        """UPDATE products 
           SET name = ?, price = ?, sizes = ?, category = ?, color = ?, gsm = ?, 
               age_group = ?, description = ?, sale_price = ?, discount_percent = ? 
           WHERE id = ?""",
        (name, price, sizes, category, color, gsm, age_group, description, 
         final_sale_price, discount_percent_to_save, product_id)
    )
    
    # Update categories
    cursor.execute("DELETE FROM product_categories WHERE product_id = ?", (product_id,))
    link_product_categories(cursor, product_id, category_ids, category)
    
    # Handle new images
    form = await request.form()
    if "images" in form:
        images = form.getlist("images")
        cursor.execute(
            "SELECT COUNT(*) as count FROM product_images WHERE product_id = ? AND is_main = 1",
            (product_id,)
        )
        has_main = cursor.fetchone()["count"] > 0
        
        for idx, image in enumerate(images):
            if hasattr(image, 'filename') and image.filename:
                original_bytes = await image.read()
                filename, _ = ImageService.save_product_image(original_bytes, image.filename)
                
                is_main = 1 if (not has_main and idx == 0) else 0
                cursor.execute(
                    "INSERT INTO product_images (product_id, filename, is_main) VALUES (?, ?, ?)",
                    (product_id, filename, is_main)
                )
    
    conn.commit()
    conn.close()
    
    return {"message": "Product updated"}


@router.post("/{product_id}/set-main-image")
def set_main_image(
    product_id: int,
    filename: str = Form(...),
    auth=Depends(verify_token),
):
    """Set which image is the main image for a product."""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT id FROM product_images WHERE product_id = ? AND filename = ?",
        (product_id, filename)
    )
    image = cursor.fetchone()
    if not image:
        conn.close()
        raise HTTPException(status_code=404, detail="Image not found for this product")
    
    cursor.execute("UPDATE product_images SET is_main = 0 WHERE product_id = ?", (product_id,))
    cursor.execute(
        "UPDATE product_images SET is_main = 1 WHERE product_id = ? AND filename = ?",
        (product_id, filename)
    )
    
    conn.commit()
    conn.close()
    
    return {"message": "Main image updated", "filename": filename}


@router.post("/{product_id}/move-inventory")
def move_inventory(
    product_id: int,
    size: str = Form(...),
    quantity: int = Form(...),
    from_location: str = Form(...),
    to_location: str = Form(...),
    auth=Depends(verify_token),
):
    """Move inventory from one location to another."""
    if from_location not in ("online", "club") or to_location not in ("online", "club"):
        raise HTTPException(status_code=400, detail="Invalid location. Must be 'online' or 'club'")
    
    if from_location == to_location:
        raise HTTPException(status_code=400, detail="Source and destination must be different")
    
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT sizes FROM products WHERE id = ?", (product_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found")
    
    try:
        sizes = json.loads(row["sizes"]) if row["sizes"] else {}
    except json.JSONDecodeError:
        sizes = {}
    
    try:
        updated_sizes = move_between_locations(sizes, size, quantity, from_location, to_location)
    except ValueError as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))
    
    cursor.execute(
        "UPDATE products SET sizes = ? WHERE id = ?",
        (json.dumps(updated_sizes), product_id)
    )
    
    conn.commit()
    conn.close()
    
    return {
        "message": f"Moved {quantity} of size {size} from {from_location} to {to_location}",
        "sizes": updated_sizes
    }


@router.delete("/{product_id}/images/{filename}")
def delete_product_image(
    product_id: int,
    filename: str,
    auth=Depends(verify_token),
):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT id, is_main FROM product_images WHERE product_id = ? AND filename = ?",
        (product_id, filename)
    )
    image = cursor.fetchone()
    if not image:
        conn.close()
        raise HTTPException(status_code=404, detail="Image not found for this product")
    
    was_main = image["is_main"] == 1
    
    # Delete files
    ImageService.delete_image(filename)
    
    # Remove from database
    cursor.execute(
        "DELETE FROM product_images WHERE product_id = ? AND filename = ?",
        (product_id, filename)
    )
    
    # Set new main image if needed
    if was_main:
        cursor.execute(
            "SELECT id FROM product_images WHERE product_id = ? ORDER BY id ASC LIMIT 1",
            (product_id,)
        )
        next_image = cursor.fetchone()
        if next_image:
            cursor.execute("UPDATE product_images SET is_main = 1 WHERE id = ?", (next_image["id"],))
    
    conn.commit()
    conn.close()
    
    return {"message": "Image deleted", "filename": filename}


@router.delete("/{product_id}")
def delete_product(product_id: int, auth=Depends(verify_token)):
    conn = get_db()
    conn.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    conn.close()
    
    return {"message": "Product deleted", "id": product_id}
