"""
Checkout and payment endpoints.
"""
from datetime import datetime

import stripe
from fastapi import APIRouter, Body, HTTPException

from ..config import settings
from ..database import get_db_context
from ..services.email import EmailService
from ..services.inventory import InventoryService


# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(tags=["checkout"])


def _save_order(customer, items, payment_method, delivery_method="pickup", delivery_cost=0, items_total=0):
    """Save an order to the database."""
    if not items_total:
        items_total = sum(item.get("price", 0) * item.get("quantity", 1) for item in items)
    total = items_total + delivery_cost

    with get_db_context() as conn:
        cursor = conn.cursor()
        customer_name = f"{customer.get('firstName', '')} {customer.get('lastName', '')}".strip()

        payment_status = "betald" if payment_method == "stripe" else "ej_betald"
        pickup_status = "ej_hamtad"

        cursor.execute(
            """INSERT INTO orders (customer_name, customer_email, customer_phone,
               delivery_method, payment_method, items_total, delivery_cost, total,
               payment_status, pickup_status, notes, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                customer_name,
                customer.get("email", ""),
                customer.get("phone", ""),
                delivery_method,
                payment_method,
                items_total,
                delivery_cost,
                total,
                payment_status,
                pickup_status,
                "",
                datetime.utcnow().isoformat(),
            )
        )
        order_id = cursor.lastrowid

        for item in items:
            cursor.execute(
                """INSERT INTO order_items (order_id, product_id, product_name, size, color, quantity, price)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    order_id,
                    item.get("id"),
                    item.get("name", ""),
                    item.get("selectedSize", ""),
                    item.get("color", ""),
                    item.get("quantity", 1),
                    item.get("price", 0),
                )
            )

    return order_id


@router.get("/stripe-publishable-key")
def get_stripe_publishable_key():
    if not settings.STRIPE_PUBLISHABLE_KEY:
        raise HTTPException(status_code=500, detail="Stripe publishable key not configured")
    
    return {"publishable_key": settings.STRIPE_PUBLISHABLE_KEY}


@router.post("/create-payment-intent")
def create_payment_intent(order: dict = Body(...)):
    """
    Create a Stripe payment intent.
    
    Args:
        order: Order details including total amount
        
    Returns:
        Client secret for completing payment
    """
    try:
        total_amount = int(order.get("total", 0) * 100)  # Convert to cents
        
        intent = stripe.PaymentIntent.create(
            amount=total_amount,
            currency='sek',
            automatic_payment_methods={'enabled': True},
            metadata={
                'customer_email': order.get("customer", {}).get("email", ""),
                'customer_name': f"{order.get('customer', {}).get('firstName', '')} {order.get('customer', {}).get('lastName', '')}",
                'items': str(len(order.get("items", [])))
            }
        )
        
        return {
            "client_secret": intent.client_secret,
            "publishable_key": settings.STRIPE_PUBLISHABLE_KEY
        }
    except Exception as e:
        print(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create payment intent")


@router.post("/checkout")
def create_order(order: dict = Body(...)):
    """
    Process a checkout order.
    
    Sends email notification and updates inventory.
    """
    print("Received order:", order)
    
    customer = order.get("customer", {})
    items = order.get("items", [])
    payment = customer.get("payment") or order.get("payment")
    
    # Send email notification
    try:
        EmailService.send_order_notification(customer, items, payment)
    except Exception as e:
        print(f"Failed to send email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")
    
    # Update stock levels
    InventoryService.reduce_stock(items)

    # Save order to database
    try:
        delivery_method = order.get("deliveryMethod", "pickup")
        delivery_cost = order.get("deliveryCost", 0)
        items_total = order.get("itemsTotal", 0)
        _save_order(customer, items, payment, delivery_method, delivery_cost, items_total)
    except Exception as e:
        print(f"Failed to save order to database: {e}")

    return {"message": "Order received, email sent, and stock updated"}


@router.post("/confirm-payment")
def confirm_payment(payment_data: dict = Body(...)):
    try:
        payment_intent_id = payment_data.get("payment_intent_id")
        order = payment_data.get("order")
        
        # Verify payment intent
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if intent.status != "succeeded":
            raise HTTPException(status_code=400, detail="Payment not completed")
        
        customer = order.get("customer", {})
        items = order.get("items", [])
        
        # Send email notification
        try:
            EmailService.send_order_notification(customer, items, "stripe")
        except Exception as e:
            print(f"Failed to send email: {e}")
            raise HTTPException(status_code=500, detail="Failed to send email")
        
        # Update stock levels
        InventoryService.reduce_stock(items)

        # Save order to database
        try:
            delivery_method = order.get("deliveryMethod", "pickup")
            delivery_cost = order.get("deliveryCost", 0)
            items_total = order.get("itemsTotal", 0)
            _save_order(customer, items, "stripe", delivery_method, delivery_cost, items_total)
        except Exception as e:
            print(f"Failed to save order to database: {e}")

        return {"message": "Payment confirmed and order processed"}
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        print(f"Payment confirmation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to confirm payment")
