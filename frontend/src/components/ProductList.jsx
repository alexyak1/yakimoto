import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const API_URL = import.meta.env.VITE_API_URL;

export const ProductList = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get('/products')
      .then(res => setProducts(res.data))
      .catch(err => console.error("Error fetching products:", err));
  }, []);

  const getStockStatus = (sizesJson) => {
    const sizes = JSON.parse(sizesJson || '{}');
    const total = Object.values(sizes).reduce((sum, qty) => sum + qty, 0);

    if (total === 0) return 'Slut i lager';
    if (total <= 2) return 'Lågt i lager';
    return 'I lager';
  };
  if (!Array.isArray(products)) {
    return <div className="p-4 text-red-500">Produkter kunde inte laddas.</div>;
  }
  return (
    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">

      {products.map((product) => (
        <Link
          key={product.id}
          to={`/products/${product.id}`}
          className="group relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition"
        >
          <div className="w-full h-96 overflow-hidden">
            {product.images?.length > 0 && (
              <img
                src={`${API_URL}/uploads/${product.images[0]}`}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{product.name}</h2>
            <p className="text-blue-700 font-medium">{product.price} kr</p>
            <p className="text-sm text-gray-500">{getStockStatus(product.sizes)}</p>
          </div>

          {/* Optional: "Slut i lager" badge overlay */}
          {getStockStatus(product.sizes) === "Slut i lager" && (
            <div className="absolute top-3 right-3 bg-red-600 text-white text-xs px-2 py-1 rounded">
              Slut i lager
            </div>
          )}
        </Link>
      ))}
    </div>

  );
};
