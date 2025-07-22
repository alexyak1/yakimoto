import React, { useEffect, useState } from 'react';
import api from '../api';

export const ProductList = ({ onAddToCart }) => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get('/products')
      .then(res => setProducts(res.data))
      .catch(err => console.error("Error fetching products:", err));
  }, []);

  return (
    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {products.map((product) => (
        <div key={product.id} className="border p-4 rounded-lg shadow">
          <img
            src={`http://localhost:8000/uploads/${product.image}`}
            alt={product.name}
            className="w-full h-48 object-cover mb-2 rounded"
          />
          <h2 className="text-xl font-semibold">{product.name}</h2>
          <p className="text-gray-700">{product.price} kr</p>
          <p className="text-gray-500">
            {product.quantity === 0
              ? "Slut i lager"
              : product.quantity === 1
                ? "Lågt i lager"
                : "I lager"}
          </p>
          {product.quantity > 0 ? (
            <button
              onClick={() => onAddToCart(product)}
              className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Lägg till i kundvagn
            </button>
          ) : (
            <button
              disabled
              className="mt-2 bg-gray-400 text-white px-4 py-2 rounded cursor-not-allowed"
            >
              Slut i lager
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
