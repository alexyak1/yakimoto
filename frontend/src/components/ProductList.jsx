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
          "Judodräkter & Kimonon – Yakimoto Dojo | Judo Gi, Bälten & Träningsoveraller",
          "Judodräkter för barn och vuxna, bälten, träningsoveraller. Snabb leverans från Sverige. Köp judo dräkt barn, judo dräkt vuxen, judogi sverige, bjj gi sverige, judo bälte. Kimono judo Alingsås.",
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
      <div className="max-w-7xl mx-auto px-0 lg:px-12">
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
            <div className="flex items-center gap-2 flex-wrap">
              {product.sale_price ? (
                <>
                  <p className="text-blue-700 font-medium text-lg">{product.sale_price} kr</p>
                  <p className="text-gray-400 line-through text-sm">{product.price} kr</p>
                  <span className="bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded">
                    -{Math.round(((product.price - product.sale_price) / product.price) * 100)}%
                  </span>
                </>
              ) : (
                <p className="text-blue-700 font-medium">{product.price} kr</p>
              )}
            </div>
            <p className="text-sm text-gray-500">{getStockStatus(product.sizes)}</p>
          </div>

          {/* Sale badge overlay */}
          {product.sale_price && (
            <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded">
              REA
            </div>
          )}
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
    </div>
  );
};
