"""
Admin utility endpoints.
"""
import os
from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from ..config import settings
from ..database import get_db
from ..dependencies import verify_token
from ..services.image import ImageService


router = APIRouter(tags=["admin"])


@router.get("/admin/thumbnail-status")
def get_thumbnail_status(auth=Depends(verify_token)):
    conn = get_db()
    cursor = conn.cursor()
    
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
        
        image_path = os.path.join(settings.UPLOAD_DIR, filename)
        if not os.path.exists(image_path):
            status["missing_originals"].append(filename)
            status["missing_count"] += 1
            continue
        
        base_name = os.path.splitext(filename)[0]
        thumbnail_path = os.path.join(settings.THUMBNAIL_DIR, f"{base_name}_thumb.jpg")
        
        if os.path.exists(thumbnail_path):
            status["with_thumbnails"].append(filename)
            status["thumbnail_count"] += 1
        else:
            status["without_thumbnails"].append(filename)
    
    conn.close()
    
    return status


@router.post("/admin/delete-thumbnails")
def delete_all_thumbnails(auth=Depends(verify_token)):
    deleted = 0
    errors = []
    
    try:
        if os.path.exists(settings.THUMBNAIL_DIR):
            for filename in os.listdir(settings.THUMBNAIL_DIR):
                if filename.endswith('_thumb.jpg'):
                    try:
                        os.remove(os.path.join(settings.THUMBNAIL_DIR, filename))
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


@router.post("/admin/generate-thumbnails")
def generate_thumbnails_for_existing_images(auth=Depends(verify_token)):
    conn = get_db()
    cursor = conn.cursor()
    
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
        
        base_name = os.path.splitext(filename)[0]
        thumbnail_path = os.path.join(settings.THUMBNAIL_DIR, f"{base_name}_thumb.jpg")
        
        if os.path.exists(thumbnail_path):
            skipped += 1
            continue
        
        image_path = os.path.join(settings.UPLOAD_DIR, filename)
        if not os.path.exists(image_path):
            errors.append(f"Original image not found: {filename}")
            continue
        
        try:
            with open(image_path, "rb") as f:
                original_bytes = f.read()
            
            thumbnail_bytes = ImageService.create_thumbnail(original_bytes)
            
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


@router.get("/sitemap.xml")
def get_sitemap():
    conn = get_db()
    cursor = conn.cursor()
    
    current_date = datetime.now().strftime('%Y-%m-%d')
    
    cursor.execute("SELECT id, name FROM products")
    products = cursor.fetchall()
    
    cursor.execute("SELECT name FROM categories")
    categories = cursor.fetchall()
    
    conn.close()
    
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
        sitemap += '  <url>\n'
        sitemap += f'    <loc>https://yakimoto.se/category/{category["name"]}</loc>\n'
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
    
    # Cart and checkout pages
    for page, priority in [("cart", "0.3"), ("checkout", "0.3")]:
        sitemap += '  <url>\n'
        sitemap += f'    <loc>https://yakimoto.se/{page}</loc>\n'
        sitemap += f'    <lastmod>{current_date}</lastmod>\n'
        sitemap += '    <changefreq>monthly</changefreq>\n'
        sitemap += f'    <priority>{priority}</priority>\n'
        sitemap += '  </url>\n'
    
    sitemap += '</urlset>'
    
    return Response(content=sitemap, media_type="application/xml")
