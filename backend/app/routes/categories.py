"""
Category management endpoints.
"""
import os
from typing import Optional

from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, UploadFile

from ..config import settings
from ..database import get_db
from ..dependencies import verify_token
from ..services.image import ImageService


router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("")
def get_categories():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM categories ORDER BY display_order ASC, id ASC")
    categories = cursor.fetchall()
    conn.close()
    
    return [dict(cat) for cat in categories]


@router.get("/{category_name}")
def get_category(category_name: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM categories WHERE name = ?", (category_name,))
    category = cursor.fetchone()
    conn.close()
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return dict(category)


@router.post("")
def create_category(
    name: str = Form(...),
    image: Optional[UploadFile] = File(None),
    auth=Depends(verify_token),
):
    conn = get_db()
    cursor = conn.cursor()
    
    image_filename = None
    if image and image.filename:
        original_bytes = image.file.read()
        image_filename, _ = ImageService.save_product_image(original_bytes, image.filename)
    
    # Check if category exists
    cursor.execute("SELECT id FROM categories WHERE name = ?", (name,))
    existing = cursor.fetchone()
    
    if existing:
        if image_filename:
            cursor.execute(
                "UPDATE categories SET image_filename = ? WHERE name = ?",
                (image_filename, name)
            )
    else:
        cursor.execute(
            "INSERT INTO categories (name, image_filename) VALUES (?, ?)",
            (name, image_filename)
        )
    
    conn.commit()
    conn.close()
    
    return {"message": "Category created/updated", "name": name}


@router.put("/{category_id}")
def update_category(
    category_id: int,
    name: str = Form(...),
    image: Optional[UploadFile] = File(None),
    auth=Depends(verify_token),
):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM categories WHERE id = ?", (category_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Category not found")
    
    image_filename = existing["image_filename"]
    if image and image.filename:
        # Delete old image
        if existing["image_filename"]:
            ImageService.delete_image(existing["image_filename"])
        
        # Save new image
        original_bytes = image.file.read()
        image_filename, _ = ImageService.save_product_image(original_bytes, image.filename)
    
    cursor.execute(
        "UPDATE categories SET name = ?, image_filename = ? WHERE id = ?",
        (name, image_filename, category_id)
    )
    
    conn.commit()
    conn.close()
    
    return {"message": "Category updated", "id": category_id, "name": name}


@router.post("/reorder")
def reorder_categories(
    category_orders: dict = Body(...),
    auth=Depends(verify_token),
):
    conn = get_db()
    cursor = conn.cursor()
    
    for category_id, display_order in category_orders.items():
        try:
            cursor.execute(
                "UPDATE categories SET display_order = ? WHERE id = ?",
                (int(display_order), int(category_id))
            )
        except (ValueError, TypeError):
            continue
    
    conn.commit()
    conn.close()
    
    return {"message": "Category order updated"}


@router.delete("/{category_name}")
def delete_category(category_name: str, auth=Depends(verify_token)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT image_filename FROM categories WHERE name = ?", (category_name,))
    category = cursor.fetchone()
    
    if category and category["image_filename"]:
        ImageService.delete_image(category["image_filename"])
    
    cursor.execute("DELETE FROM categories WHERE name = ?", (category_name,))
    conn.commit()
    conn.close()
    
    return {"message": "Category deleted", "name": category_name}
