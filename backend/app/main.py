from typing import List
import os
import time
import uuid
import sqlite3
import jwt
import shutil
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, Depends, Body
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import stripe

load_dotenv()

app = FastAPI()

# Constants
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM")
JWT_EXP_DELTA_SECONDS = int(os.getenv("JWT_EXP_DELTA_SECONDS"))
DB_FILE = "app/database.db"
UPLOAD_DIR = "app/uploads"

# Stripe configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY")

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://192.168.0.100:5173",
        "http://localhost",
        "http://localhost:80",
        "http://192.168.0.100",
        "http://192.168.0.100:80",
        "http://localhost:5173",           # dev
        "http://192.168.0.100:5173",       # local IP
        "http://46.62.154.96",             # ✅ production
        "http://yakimoto.se",    
        "https://www.yakimoto.se",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SQLite connection helper
def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

# Setup DB schema
def setup_database():
    conn = get_db()
    # ⚠️ Remove these in production
    # conn.execute("DROP TABLE IF EXISTS products")
    # conn.execute("DROP TABLE IF EXISTS product_sizes")
    # conn.execute("DROP TABLE IF EXISTS product_images")

    conn.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            price INTEGER,
            image TEXT,
            sizes TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS product_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            filename TEXT,
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS product_sizes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            size TEXT,
            quantity INTEGER,
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    """)
    conn.commit()
    conn.close()

setup_database()

def verify_token(authorization: str = Header(...)):
    print("AUTH HEADER:", authorization)
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError("Invalid auth scheme")
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        print("Payload OK:", payload)
        return payload
    except Exception as e:
        print("Token error:", e)
        raise HTTPException(status_code=403, detail="Invalid or expired token")

# Data models
class Product(BaseModel):
    name: str
    price: int
    image: str
    quantity: int

@app.get("/products")
def read_products():
    conn = get_db()
    cursor = conn.cursor()

    # Fetch products
    cursor.execute("SELECT * FROM products")
    products = cursor.fetchall()

    result = []
    for product in products:
        product_dict = dict(product)

        # Fetch images for each product
        cursor.execute("SELECT filename FROM product_images WHERE product_id = ?", (product["id"],))
        image_rows = cursor.fetchall()
        product_dict["images"] = [img["filename"] for img in image_rows]

        result.append(product_dict)

    conn.close()
    return result

@app.get("/products/{product_id}")
def get_product(product_id: int):
    conn = get_db()
    cursor = conn.cursor()

    # Fetch product
    product = cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
    if not product:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found")

    # Fetch related images
    images = cursor.execute(
        "SELECT filename FROM product_images WHERE product_id = ?", (product_id,)
    ).fetchall()
    conn.close()

    product_dict = dict(product)
    product_dict["images"] = [row["filename"] for row in images]

    return product_dict

@app.post("/products")
def create_product(
    name: str = Form(...),
    price: int = Form(...),
    sizes: str = Form(...),
    images: List[UploadFile] = File(...),
    auth=Depends(verify_token),
):
    conn = get_db()
    cursor = conn.cursor()

    # Insert product (without image column)
    cursor.execute(
        "INSERT INTO products (name, price, sizes) VALUES (?, ?, ?)",
        (name, price, sizes)
    )
    product_id = cursor.lastrowid

    # Save images
    for image in images:
        filename = f"{uuid.uuid4()}_{image.filename}"
        image_path = os.path.join(UPLOAD_DIR, filename)
        with open(image_path, "wb") as buffer:
            buffer.write(image.file.read())

        # Link image to product
        cursor.execute(
            "INSERT INTO product_images (product_id, filename) VALUES (?, ?)",
            (product_id, filename)
        )

    conn.commit()
    conn.close()

    return {"message": "Product created", "id": product_id}

@app.put("/products/{product_id}")
def update_product(
    product_id: int,
    name: str = Form(...),
    price: float = Form(...),
    sizes: str = Form(...),
    auth=Depends(verify_token),
):
    conn = get_db()
    conn.execute(
        "UPDATE products SET name = ?, price = ?, sizes = ? WHERE id = ?",
        (name, price, sizes, product_id),
    )
    conn.commit()
    conn.close()
    return {"message": "Product updated"}

@app.delete("/products/{product_id}")
def delete_product(product_id: int, auth=Depends(verify_token)):
    conn = get_db()
    conn.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    conn.close()
    return {"message": "Product deleted", "id": product_id}

@app.post("/login")
def login(password: str = Form(...)):
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized")

    payload = {
        "sub": "admin",
        "exp": time.time() + JWT_EXP_DELTA_SECONDS
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {"token": token}

import json  # ensure at top of file

import json  # Ensure this is imported at the top

@app.post("/checkout")
def create_order(order: dict = Body(...)):
    print("Received order:", order)

    customer = order.get("customer", {})
    items = order.get("items", [])
    payment = customer.get("payment") or order.get("payment")

    # Handle different payment methods
    payment_display = payment
    if payment == "stripe":
        payment_display = "Stripe (Betalning genomförd)"
    elif payment == "swish":
        payment_display = "Swish"
    elif payment == "bankgiro":
        payment_display = "Bankgiro"

    # Compose email
    body = f"Ny beställning från {customer.get('firstName', '')} {customer.get('lastName', '')}\n\n"
    body += f"E-post: {customer.get('email', '')}\nTelefon: {customer.get('phone', '')}\nBetalning: {payment_display}\n\n"
    body += "Produkter:\n"
    for item in items:
        body += f"- {item.get('name')} ({item.get('selectedSize')}) x{item.get('quantity')} – {item.get('price')} kr\n"


    msg = MIMEMultipart()
    msg["From"] = os.getenv("SMTP_USER")
    msg["To"] = os.getenv("EMAIL_RECEIVER")
    msg["Subject"] = f"Ny beställning på Yakimoto Dojo ({payment_display})"
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(os.getenv("SMTP_SERVER"), int(os.getenv("SMTP_PORT"))) as server:
            server.starttls()
            server.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD"))
            server.send_message(msg)
            print("Email sent.")
    except Exception as e:
        print("Failed to send email:", e)
        raise HTTPException(status_code=500, detail="Failed to send email")

    # 🔽 Update stock levels in the database
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
            sizes[size] = max(0, sizes[size] - quantity)

        updated_sizes = json.dumps(sizes)
        cursor.execute("UPDATE products SET sizes = ? WHERE id = ?", (updated_sizes, product_id))

    conn.commit()
    conn.close()

    return {"message": "Order received, email sent, and stock updated"}

@app.get("/stripe-publishable-key")
def get_stripe_publishable_key():
    """Get Stripe publishable key for frontend"""
    if not STRIPE_PUBLISHABLE_KEY:
        raise HTTPException(status_code=500, detail="Stripe publishable key not configured")
    return {"publishable_key": STRIPE_PUBLISHABLE_KEY}

@app.post("/create-payment-intent")
def create_payment_intent(order: dict = Body(...)):
    try:
        # Calculate total amount in cents (Stripe uses smallest currency unit)
        total_amount = int(order.get("total", 0) * 100)
        
        # Create payment intent
        intent = stripe.PaymentIntent.create(
            amount=total_amount,
            currency='sek',  # Swedish Krona
            metadata={
                'customer_email': order.get("customer", {}).get("email", ""),
                'customer_name': f"{order.get('customer', {}).get('firstName', '')} {order.get('customer', {}).get('lastName', '')}",
                'items': str(len(order.get("items", [])))
            }
        )
        
        return {
            "client_secret": intent.client_secret,
            "publishable_key": STRIPE_PUBLISHABLE_KEY
        }
    except Exception as e:
        print(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create payment intent")

@app.post("/confirm-payment")
def confirm_payment(payment_data: dict = Body(...)):
    try:
        payment_intent_id = payment_data.get("payment_intent_id")
        order = payment_data.get("order")
        
        # Verify payment intent
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if intent.status != "succeeded":
            raise HTTPException(status_code=400, detail="Payment not completed")
        
        # Process the order (same as regular checkout)
        customer = order.get("customer", {})
        items = order.get("items", [])
        
        # Compose email
        body = f"Ny beställning från {customer.get('firstName', '')} {customer.get('lastName', '')}\n\n"
        body += f"E-post: {customer.get('email', '')}\nTelefon: {customer.get('phone', '')}\nBetalning: Stripe (Betalning genomförd)\n\n"
        body += "Produkter:\n"
        for item in items:
            body += f"- {item.get('name')} ({item.get('selectedSize')}) x{item.get('quantity')} – {item.get('price')} kr\n"

        msg = MIMEMultipart()
        msg["From"] = os.getenv("SMTP_USER")
        msg["To"] = os.getenv("EMAIL_RECEIVER")
        msg["Subject"] = "Ny beställning på Yakimoto Dojo (Stripe betalning)"
        msg.attach(MIMEText(body, "plain"))

        try:
            with smtplib.SMTP(os.getenv("SMTP_SERVER"), int(os.getenv("SMTP_PORT"))) as server:
                server.starttls()
                server.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD"))
                server.send_message(msg)
                print("Email sent.")
        except Exception as e:
            print("Failed to send email:", e)
            raise HTTPException(status_code=500, detail="Failed to send email")

        # Update stock levels in the database
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
                sizes[size] = max(0, sizes[size] - quantity)

            updated_sizes = json.dumps(sizes)
            cursor.execute("UPDATE products SET sizes = ? WHERE id = ?", (updated_sizes, product_id))

        conn.commit()
        conn.close()

        return {"message": "Payment confirmed and order processed"}
        
    except Exception as e:
        print(f"Payment confirmation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to confirm payment")
