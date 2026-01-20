import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { SmartImage } from './SmartImage';
import { NEW_PRODUCT_LABEL, SALE_LABEL } from '../constants';

export const ProductGroup = ({ category }) => {
  const [groupedProducts, setGroupedProducts] = useState([]);

  useEffect(() => {
    if (category) {
      // Fetch grouped products
      api.get(`/products/grouped/${category}`)
        .then(res => {
          setGroupedProducts(res.data);
        })
        .catch(err => console.error("Error fetching grouped products:", err));
    }
  }, [category]);

  if (!category || !groupedProducts || groupedProducts.length === 0) {
    return null;
  }

  // Group products by their attributes (color, gsm, age_group)
  // Create unique combinations and pick one representative product from each
  const groupByAttributes = (products) => {
    const groups = {};
    
    products.forEach(product => {
      const color = (product.color || '').toLowerCase();
      const gsm = product.gsm || '';
      const ageGroup = (product.age_group || '').toLowerCase();
      
      // Create a key for unique combinations
      const key = `${ageGroup}_${color}_${gsm}`;
      
      if (!groups[key]) {
        groups[key] = {
          color: product.color || '',
          gsm: product.gsm || '',
          age_group: product.age_group || '',
          products: []
        };
      }
      groups[key].products.push(product);
    });
    
    return Object.values(groups);
  };

  const attributeGroups = groupByAttributes(groupedProducts);

  // Get the first product from each group for display
  // Format label like "Children Blue 550GSM" or "White 750GSM"
  const displayProducts = attributeGroups.map(group => {
    const parts = [];
    if (group.age_group) {
      parts.push(group.age_group.charAt(0).toUpperCase() + group.age_group.slice(1));
    }
    if (group.color) {
      parts.push(group.color.charAt(0).toUpperCase() + group.color.slice(1));
    }
    if (group.gsm) {
      parts.push(`${group.gsm}GSM`);
    }
    
    return {
      ...group.products[0],
      label: parts.length > 0 ? parts.join(' ') : group.products[0].name
    };
  });

  // Limit to 4 panels for the hero section (like ridestore)
  const displayProductsLimited = displayProducts.slice(0, 4);

  if (displayProductsLimited.length === 0) {
    return null;
  }

  return (
    <div className="w-full mb-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
        {displayProductsLimited.map((product, index) => {
          return (
            <Link
              key={product.id || index}
              to={`/category/${category}`}
              className="group relative overflow-hidden h-[600px] hover:opacity-95 transition-opacity duration-300"
            >
              <div className="w-full h-full overflow-hidden bg-gray-100">
                {product.images?.length > 0 ? (
                  <SmartImage
                    src={product.images[0]}
                    alt={product.label || product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                    Ingen bild
                  </div>
                )}
              </div>
              {/* Badges at top */}
              <div className="absolute top-3 left-3 flex gap-2">
                {product.sale_price && product.sale_price > 0 && product.sale_price < product.price && (
                  <span className="bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded">
                    {SALE_LABEL}
                  </span>
                )}
                {!!product.is_new && (
                  <span className="bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded">
                    {NEW_PRODUCT_LABEL}
                  </span>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                <h3 className="text-white font-bold text-xl mb-1">
                  {product.label || product.name}
                </h3>
                {product.price && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {product.sale_price && product.sale_price > 0 && product.sale_price < product.price ? (
                      <>
                        <p className="text-white font-semibold text-lg">{product.sale_price} kr</p>
                        <p className="text-white/60 line-through text-sm">{product.price} kr</p>
                        <span className="bg-red-600 text-white text-xs font-semibold px-2 py-0.5 rounded">
                          -{Math.round(((product.price - product.sale_price) / product.price) * 100)}%
                        </span>
                      </>
                    ) : (
                      <p className="text-white/90 text-base">{product.price} kr</p>
                    )}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

