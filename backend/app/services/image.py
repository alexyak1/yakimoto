"""
Image processing and optimization service.
"""
import io
import os
import uuid
from PIL import Image, ImageOps

from ..config import settings


class ImageService:
    """Service for image optimization and thumbnail generation."""
    
    @staticmethod
    def apply_exif_orientation(img: Image.Image) -> Image.Image:
        """Apply EXIF orientation to image if present."""
        try:
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass
        return img
    
    @staticmethod
    def convert_to_rgb(img: Image.Image) -> Image.Image:
        """Convert image to RGB mode for JPEG compatibility."""
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(
                img,
                mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None
            )
            return background
        elif img.mode != 'RGB':
            return img.convert('RGB')
        return img
    
    @classmethod
    def optimize_image(
        cls,
        image_bytes: bytes,
        max_size: tuple = None,
        quality: int = None
    ) -> bytes:
        """
        Resize and compress an image.
        
        Args:
            image_bytes: Raw image bytes
            max_size: Maximum dimensions (width, height)
            quality: JPEG quality (1-100)
            
        Returns:
            Optimized image bytes
        """
        max_size = max_size or settings.MAX_IMAGE_SIZE
        quality = quality or settings.IMAGE_QUALITY
        
        img = Image.open(io.BytesIO(image_bytes))
        img = cls.apply_exif_orientation(img)
        img = cls.convert_to_rgb(img)
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True, exif=b'')
        return output.getvalue()
    
    @classmethod
    def create_thumbnail(
        cls,
        image_bytes: bytes,
        size: tuple = None,
        quality: int = None
    ) -> bytes:
        """
        Create a thumbnail version of an image.
        
        Args:
            image_bytes: Raw image bytes
            size: Thumbnail dimensions (width, height)
            quality: JPEG quality (1-100)
            
        Returns:
            Thumbnail image bytes
        """
        size = size or settings.THUMBNAIL_SIZE
        quality = quality or settings.THUMBNAIL_QUALITY
        
        img = Image.open(io.BytesIO(image_bytes))
        img = cls.apply_exif_orientation(img)
        img = cls.convert_to_rgb(img)
        img.thumbnail(size, Image.Resampling.LANCZOS)
        
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True, exif=b'')
        return output.getvalue()
    
    @classmethod
    def save_product_image(cls, image_bytes: bytes, original_filename: str) -> tuple:
        """
        Save an optimized product image and its thumbnail.
        
        Args:
            image_bytes: Raw image bytes
            original_filename: Original filename for naming
            
        Returns:
            Tuple of (main_filename, thumbnail_filename)
        """
        # Generate unique filenames
        base_filename = f"{uuid.uuid4()}_{original_filename}"
        filename = os.path.splitext(base_filename)[0] + ".jpg"
        thumbnail_filename = os.path.splitext(base_filename)[0] + "_thumb.jpg"
        
        # Optimize and save main image
        optimized_bytes = cls.optimize_image(image_bytes)
        image_path = os.path.join(settings.UPLOAD_DIR, filename)
        with open(image_path, "wb") as f:
            f.write(optimized_bytes)
        
        # Create and save thumbnail
        thumbnail_bytes = cls.create_thumbnail(image_bytes)
        thumbnail_path = os.path.join(settings.THUMBNAIL_DIR, thumbnail_filename)
        with open(thumbnail_path, "wb") as f:
            f.write(thumbnail_bytes)
        
        return filename, thumbnail_filename
    
    @staticmethod
    def delete_image(filename: str) -> bool:
        """
        Delete an image and its thumbnail from disk.
        
        Args:
            filename: Image filename
            
        Returns:
            True if deletion was successful
        """
        deleted = False
        
        # Delete main image
        image_path = os.path.join(settings.UPLOAD_DIR, filename)
        if os.path.exists(image_path):
            try:
                os.remove(image_path)
                deleted = True
            except Exception as e:
                print(f"Error deleting image file {image_path}: {e}")
        
        # Delete thumbnail
        base_name = os.path.splitext(filename)[0]
        thumbnail_filename = f"{base_name}_thumb.jpg"
        thumbnail_path = os.path.join(settings.THUMBNAIL_DIR, thumbnail_filename)
        if os.path.exists(thumbnail_path):
            try:
                os.remove(thumbnail_path)
            except Exception as e:
                print(f"Error deleting thumbnail {thumbnail_path}: {e}")
        
        return deleted
