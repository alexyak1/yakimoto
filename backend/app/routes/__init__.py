"""
API route modules.
"""
from .products import router as products_router
from .categories import router as categories_router
from .auth import router as auth_router
from .checkout import router as checkout_router
from .admin import router as admin_router
