import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { generateStructuredData, addStructuredDataToHead, updatePageMeta } from '../seo.jsx';
import { CategoriesSection } from './CategoriesSection';
import { SmartImage } from './SmartImage';

export const ProductList = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get('/products')
      .then(res => {
        setProducts(res.data);
        
        // Update page meta tags and canonical URL for homepage
        updatePageMeta(
          "Yakimoto Dojo - Judo Gi, Judo Dräkt & Judo Suit | Alingsås Judoklubb",
          "Köp högkvalitativa judo gi, judo dräkt och judo suit från Yakimoto Dojo. Officiell butik för Alingsås Judoklubb. Snabb leverans och expertis inom judo-utrustning.",
          "https://yakimoto.se"
        );
        
        // Add structured data for SEO
        const structuredData = generateStructuredData(res.data);
        addStructuredDataToHead(structuredData);
      })
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
    <div className="p-6">
      {/* Categories Section - shown first */}
      <CategoriesSection />
      
      {/* All Products Section */}
      <h2 className="text-2xl font-bold mb-6">Alla produkter</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">

      {products.map((product) => (
        <Link
          key={product.id}
          to={`/products/${product.id}`}
          className="group relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition"
        >
          <div className="w-full h-96 overflow-hidden">
            {product.images?.length > 0 && (
              <SmartImage
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
                loading="lazy"
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
    </div>
  );
};
