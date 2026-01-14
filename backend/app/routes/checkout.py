"""
Checkout and payment endpoints.
"""
import json

import stripe
from fastapi import APIRouter, Body, HTTPException

from ..config import settings
from ..database import get_db
from ..services.email import EmailService
from ..services.inventory import InventoryService, normalize_sizes


# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(tags=["checkout"])


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
                if isinstance(sizes[size], dict):
                    sizes[size]["online"] = max(0, sizes[size].get("online", 0) - quantity)
                else:
                    sizes[size] = max(0, sizes[size] - quantity)
            
            cursor.execute(
                "UPDATE products SET sizes = ? WHERE id = ?",
                (json.dumps(sizes), product_id)
            )
        
        conn.commit()
        conn.close()
        
        return {"message": "Payment confirmed and order processed"}
        
    except Exception as e:
        print(f"Payment confirmation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to confirm payment")
