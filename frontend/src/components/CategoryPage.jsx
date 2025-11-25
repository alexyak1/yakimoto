import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { updatePageMeta } from '../seo.jsx';
import { SmartImage } from './SmartImage';

export const CategoryPage = () => {
  const { categoryName } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (categoryName) {
      fetchCategoryData();
    }
  }, [categoryName]);

  const fetchCategoryData = async () => {
    setLoading(true);
    try {
      // Fetch products in category
      const productsRes = await api.get(`/products/category/${categoryName}`);
      setProducts(productsRes.data);

      // Update page meta with SEO keywords
      const categoryDisplay = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
      let seoTitle = `${categoryDisplay} - Yakimoto Dojo`;
      let seoDescription = `Köp ${categoryName} från Yakimoto Dojo. Högkvalitativa produkter med snabb leverans från Sverige.`;
      
      // Add Swedish keywords based on category
      const categoryLower = categoryName.toLowerCase();
      if (categoryLower.includes('gi') || categoryLower.includes('kimono')) {
        seoTitle = `Judogi Sverige & Kimono - ${categoryDisplay} | Yakimoto Dojo`;
        seoDescription = `Köp ${categoryName} (judogi, kimono) från Yakimoto Dojo. Högkvalitativa judo gi för träning och tävling. Snabb leverans från Sverige.`;
      } else if (categoryLower.includes('dräkt')) {
        seoTitle = `Judodräkter - ${categoryDisplay} | Yakimoto Dojo`;
        seoDescription = `Köp ${categoryName} (judodräkter) för barn och vuxna från Yakimoto Dojo. Högkvalitativ judo utrustning. Snabb leverans från Sverige.`;
      } else if (categoryLower.includes('bälte') || categoryLower.includes('bälten')) {
        seoTitle = `Judo Bälte & Bälten - ${categoryDisplay} | Yakimoto Dojo`;
        seoDescription = `Köp ${categoryName} (judo bälte, judo bälten) från Yakimoto Dojo. Högkvalitativa bälten för alla nivåer. Snabb leverans från Sverige.`;
      }
      
      updatePageMeta(
        seoTitle,
        seoDescription,
        `https://yakimoto.se/category/${categoryName}`
      );
    } catch (err) {
      console.error("Error fetching category data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (sizesJson) => {
    const sizes = JSON.parse(sizesJson || '{}');
    const total = Object.values(sizes).reduce((sum, qty) => sum + qty, 0);

    if (total === 0) return 'Slut i lager';
    if (total <= 2) return 'Lågt i lager';
    return 'I lager';
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p>Laddar...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Inga produkter i denna kategori ännu.</p>
          <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Tillbaka till startsidan
          </Link>
        </div>
      ) : (
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
      )}
    </div>
  );
};

