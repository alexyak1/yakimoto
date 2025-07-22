import os
import time
import uuid
import sqlite3
import jwt
import shutil

from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM")
JWT_EXP_DELTA_SECONDS = int(os.getenv("JWT_EXP_DELTA_SECONDS"))

# CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploads directory
UPLOAD_DIR = "app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# SQLite setup
def get_db():
    conn = sqlite3.connect("app/database.db")
    conn.row_factory = sqlite3.Row
    return conn

conn = get_db()
conn.execute("DROP TABLE IF EXISTS products")
conn.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        price INTEGER,
        image TEXT,
        quantity INTEGER
    )
""")
conn.commit()
conn.close()

class Product(BaseModel):
    name: str
    price: int
    image: str
    quantity: int

def verify_token(authorization: str = Header(...)):
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError("Invalid scheme")
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception:
        raise HTTPException(status_code=403, detail="Invalid or expired token")
    
@app.get("/products")
def read_products():
    conn = get_db()
    rows = conn.execute("SELECT * FROM products").fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/products")
def create_product(
    name: str = Form(...),
    price: int = Form(...),
    quantity: int = Form(...),
    image: UploadFile = File(...),
    token: str = Depends(verify_token)
):
    filename = f"{uuid.uuid4()}_{image.filename}"
    image_path = os.path.join(UPLOAD_DIR, filename)

    with open(image_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    conn = get_db()
    conn.execute(
        "INSERT INTO products (name, price, quantity, image) VALUES (?, ?, ?, ?)",
        (name, price, quantity, filename)
    )
    conn.commit()
    conn.close()
    return {"message": "Product created"}

@app.delete("/products/{product_id}")
def delete_product(product_id: int, auth=Depends(verify_token)):
    conn = get_db()
    cursor = conn.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    conn.close()
    return {"message": "Product deleted", "id": product_id}

@app.post("/login")
def login(password: str = Form(...)):
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized")

    payload = {
        "sub": "admin",
        "exp": time.time() + int(JWT_EXP_DELTA_SECONDS) 
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {"token": token}

@app.put("/products/{product_id}")
async def update_product(
    product_id: int,
    name: str = Form(...),
    price: int = Form(...),
    quantity: int = Form(...),
    token: str = Depends(verify_token)
):
    conn = get_db()
    conn.execute(
        "UPDATE products SET name = ?, price = ?, quantity = ? WHERE id = ?",
        (name, price, quantity, product_id)
    )
    conn.commit()
    conn.close()
    return {"message": "Product updated"}