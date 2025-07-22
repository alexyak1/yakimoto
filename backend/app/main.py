from fastapi import FastAPI
from pydantic import BaseModel
import sqlite3

app = FastAPI()

def get_db():
    conn = sqlite3.connect("app/database.db")
    conn.row_factory = sqlite3.Row
    return conn

conn = get_db()
conn.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        price INTEGER,
        image TEXT
    )
""")
conn.commit()
conn.close()

class Product(BaseModel):
    name: str
    price: int
    image: str

@app.get("/products")
def read_products():
    conn = get_db()
    rows = conn.execute("SELECT * FROM products").fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/products")
def create_product(product: Product):
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO products (name, price, image) VALUES (?, ?, ?)",
        (product.name, product.price, product.image)
    )
    conn.commit()
    conn.close()
    return { "id": cursor.lastrowid, **product.dict() }
