"""
Order management endpoints.
"""
from datetime import datetime

import jwt
from fastapi import APIRouter, Body, Depends, HTTPException, Request

from ..config import settings
from ..database import get_db_context


router = APIRouter(prefix="/orders", tags=["orders"])


def require_admin(request: Request):
    """Verify admin JWT token."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = auth.split(" ", 1)[1]
    try:
        jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("")
def list_orders(request: Request, _=Depends(require_admin)):
    """Get all orders with their items."""
    with get_db_context() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM orders ORDER BY created_at DESC")
        orders = [dict(row) for row in cursor.fetchall()]

        for order in orders:
            cursor.execute(
                "SELECT * FROM order_items WHERE order_id = ?",
                (order["id"],)
            )
            order["items"] = [dict(row) for row in cursor.fetchall()]

    return orders


@router.get("/{order_id}")
def get_order(order_id: int, request: Request, _=Depends(require_admin)):
    """Get a single order with its items."""
    with get_db_context() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
        order = cursor.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        order = dict(order)
        cursor.execute(
            "SELECT * FROM order_items WHERE order_id = ?",
            (order_id,)
        )
        order["items"] = [dict(row) for row in cursor.fetchall()]

    return order


@router.put("/{order_id}/status")
def update_order_status(
    order_id: int,
    body: dict = Body(...),
    request: Request = None,
    _=Depends(require_admin),
):
    """Update order payment_status and/or pickup_status."""
    payment_status = body.get("payment_status")
    pickup_status = body.get("pickup_status")

    valid_payment = {"betald", "ej_betald"}
    valid_pickup = {"hamtad", "ej_hamtad"}

    if payment_status and payment_status not in valid_payment:
        raise HTTPException(status_code=400, detail=f"Invalid payment_status. Must be one of: {valid_payment}")
    if pickup_status and pickup_status not in valid_pickup:
        raise HTTPException(status_code=400, detail=f"Invalid pickup_status. Must be one of: {valid_pickup}")
    if not payment_status and not pickup_status:
        raise HTTPException(status_code=400, detail="Provide payment_status and/or pickup_status")

    with get_db_context() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM orders WHERE id = ?", (order_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Order not found")

        if payment_status:
            cursor.execute("UPDATE orders SET payment_status = ? WHERE id = ?", (payment_status, order_id))
        if pickup_status:
            cursor.execute("UPDATE orders SET pickup_status = ? WHERE id = ?", (pickup_status, order_id))

    return {"message": "Status updated"}


@router.put("/{order_id}/notes")
def update_order_notes(
    order_id: int,
    body: dict = Body(...),
    request: Request = None,
    _=Depends(require_admin),
):
    """Update order notes."""
    notes = body.get("notes", "")

    with get_db_context() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM orders WHERE id = ?", (order_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Order not found")

        cursor.execute(
            "UPDATE orders SET notes = ? WHERE id = ?",
            (notes, order_id)
        )

    return {"message": "Notes updated"}


@router.put("/customer/update")
def update_customer(body: dict = Body(...), request: Request = None, _=Depends(require_admin)):
    """Update customer info across all their orders."""
    old_name = body.get("old_name", "")
    new_name = body.get("customer_name", old_name)
    email = body.get("customer_email", "")
    phone = body.get("customer_phone", "")

    with get_db_context() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE orders SET customer_name = ?, customer_email = ?, customer_phone = ? WHERE customer_name = ?",
            (new_name, email, phone, old_name)
        )

    return {"message": "Customer updated"}


@router.put("/{order_id}")
def update_order(order_id: int, body: dict = Body(...), request: Request = None, _=Depends(require_admin)):
    """Update an entire order."""
    with get_db_context() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM orders WHERE id = ?", (order_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Order not found")

        items = body.get("items", [])
        items_total = sum(item.get("price", 0) * item.get("quantity", 1) for item in items)

        cursor.execute(
            """UPDATE orders SET customer_name = ?, customer_email = ?, customer_phone = ?,
               payment_method = ?, payment_status = ?, pickup_status = ?,
               notes = ?, created_at = ?, items_total = ?, total = ?
               WHERE id = ?""",
            (
                body.get("customer_name", ""),
                body.get("customer_email", ""),
                body.get("customer_phone", ""),
                body.get("payment_method", ""),
                body.get("payment_status", "ej_betald"),
                body.get("pickup_status", "ej_hamtad"),
                body.get("notes", ""),
                body.get("created_at") or datetime.utcnow().isoformat(),
                items_total,
                items_total,
                order_id,
            )
        )

        # Replace items
        cursor.execute("DELETE FROM order_items WHERE order_id = ?", (order_id,))
        for item in items:
            item_cost = item.get("cost")
            if item_cost is None:
                pid = item.get("product_id") or item.get("id")
                if pid:
                    cursor.execute("SELECT cost FROM products WHERE id = ?", (pid,))
                    row = cursor.fetchone()
                    if row:
                        item_cost = row["cost"]
            cursor.execute(
                """INSERT INTO order_items (order_id, product_id, product_name, size, color, quantity, price, cost)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    order_id,
                    item.get("product_id") or item.get("id"),
                    item.get("product_name") or item.get("name", ""),
                    item.get("size", ""),
                    item.get("color", ""),
                    item.get("quantity", 1),
                    item.get("price", 0),
                    item_cost,
                )
            )

    return {"message": "Order updated"}


@router.delete("/{order_id}")
def delete_order(order_id: int, request: Request, _=Depends(require_admin)):
    """Delete an order."""
    with get_db_context() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM orders WHERE id = ?", (order_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Order not found")

        cursor.execute("DELETE FROM order_items WHERE order_id = ?", (order_id,))
        cursor.execute("DELETE FROM orders WHERE id = ?", (order_id,))

    return {"message": "Order deleted"}


@router.post("")
def create_order_manual(body: dict = Body(...), request: Request = None, _=Depends(require_admin)):
    """Manually create an order from admin panel."""
    with get_db_context() as conn:
        cursor = conn.cursor()

        customer_name = body.get("customer_name", "")
        items = body.get("items", [])
        payment_method = body.get("payment_method", "")
        notes = body.get("notes", "")
        payment_status = body.get("payment_status", "ej_betald")
        pickup_status = body.get("pickup_status", "ej_hamtad")
        created_at = body.get("created_at") or datetime.utcnow().isoformat()

        items_total = sum(item.get("price", 0) * item.get("quantity", 1) for item in items)

        cursor.execute(
            """INSERT INTO orders (customer_name, customer_email, customer_phone,
               delivery_method, payment_method, items_total, delivery_cost, total,
               payment_status, pickup_status, notes, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                customer_name,
                body.get("customer_email", ""),
                body.get("customer_phone", ""),
                body.get("delivery_method", "pickup"),
                payment_method,
                items_total,
                0,
                items_total,
                payment_status,
                pickup_status,
                notes,
                created_at,
            )
        )
        order_id = cursor.lastrowid

        for item in items:
            item_cost = item.get("cost")
            if item_cost is None:
                pid = item.get("product_id") or item.get("id")
                if pid:
                    cursor.execute("SELECT cost FROM products WHERE id = ?", (pid,))
                    row = cursor.fetchone()
                    if row:
                        item_cost = row["cost"]
            cursor.execute(
                """INSERT INTO order_items (order_id, product_id, product_name, size, color, quantity, price, cost)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    order_id,
                    item.get("product_id") or item.get("id"),
                    item.get("product_name") or item.get("name", ""),
                    item.get("size", ""),
                    item.get("color", ""),
                    item.get("quantity", 1),
                    item.get("price", 0),
                    item_cost,
                )
            )

    return {"message": "Order created", "order_id": order_id}
