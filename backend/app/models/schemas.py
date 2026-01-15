"""
Pydantic models for request/response validation.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class Product(BaseModel):
    name: str
    price: int
    image: Optional[str] = None
    quantity: Optional[int] = None


class ProductCreate(BaseModel):
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
    name: str
    image_filename: Optional[str] = None


class CategoryOrder(BaseModel):
    orders: Dict[str, int]


class OrderItem(BaseModel):
    id: int
    name: str
    price: int
    quantity: int
    selectedSize: str
    color: Optional[str] = None


class CustomerInfo(BaseModel):
    firstName: str
    lastName: str
    email: str
    phone: str
    payment: Optional[str] = None


class Order(BaseModel):
    customer: CustomerInfo
    items: List[OrderItem]
    total: Optional[float] = None
    payment: Optional[str] = None


class PaymentIntentRequest(BaseModel):
    total: float
    customer: Optional[CustomerInfo] = None
    items: Optional[List[OrderItem]] = None


class PaymentConfirmation(BaseModel):
    payment_intent_id: str
    order: Order
