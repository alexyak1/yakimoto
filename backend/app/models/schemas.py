"""
Pydantic models for request/response validation.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class Product(BaseModel):
    """Product model for API responses."""
    name: str
    price: int
    image: Optional[str] = None
    quantity: Optional[int] = None


class ProductCreate(BaseModel):
    """Product creation model."""
    name: str
    price: int
    sizes: str
    category: Optional[str] = None
    color: Optional[str] = None
    gsm: Optional[str] = None
    age_group: Optional[str] = None
    description: Optional[str] = None
    sale_price: Optional[int] = None
    discount_percent: Optional[int] = None
    category_ids: Optional[str] = None


class CategoryCreate(BaseModel):
    """Category creation model."""
    name: str
    image_filename: Optional[str] = None


class CategoryOrder(BaseModel):
    """Category ordering model."""
    orders: Dict[str, int]


class OrderItem(BaseModel):
    """Single item in an order."""
    id: int
    name: str
    price: int
    quantity: int
    selectedSize: str
    color: Optional[str] = None


class CustomerInfo(BaseModel):
    """Customer information for checkout."""
    firstName: str
    lastName: str
    email: str
    phone: str
    payment: Optional[str] = None


class Order(BaseModel):
    """Complete order model."""
    customer: CustomerInfo
    items: List[OrderItem]
    total: Optional[float] = None
    payment: Optional[str] = None


class PaymentIntentRequest(BaseModel):
    """Request for creating a payment intent."""
    total: float
    customer: Optional[CustomerInfo] = None
    items: Optional[List[OrderItem]] = None


class PaymentConfirmation(BaseModel):
    """Payment confirmation request."""
    payment_intent_id: str
    order: Order
