import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { SmartImage } from './SmartImage';

export const CategoriesSection = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error("Error fetching categories:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p>Laddar kategorier...</p>
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="mb-12 relative -mx-6 left-0 right-0 w-[calc(100%+3rem)] lg:mx-0 lg:left-auto lg:right-auto lg:w-full">
      <div className="relative w-full max-w-7xl mx-auto px-0 lg:px-12">
        <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-0 overflow-x-auto sm:overflow-x-visible snap-x snap-mandatory sm:snap-none scrollbar-hide">
          {categories.map((category) => {
            const displayName = category.name 
              ? category.name.charAt(0).toUpperCase() + category.name.slice(1)
              : 'Kategori';

            return (
              <Link
                key={category.id || category.name}
                to={`/category/${category.name}`}
                className="group relative overflow-hidden h-[400px] sm:h-[500px] lg:h-[600px] hover:opacity-95 transition-opacity duration-300 flex-shrink-0 w-[55vw] sm:w-auto snap-start sm:snap-none"
              >
                <div className="w-full h-full overflow-hidden bg-gray-100">
                  {category.image_filename ? (
                    <SmartImage
                      src={category.image_filename}
                      alt={displayName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                      Ingen bild
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                  <h3 className="text-white font-bold text-2xl lg:text-3xl mb-1">
                    {displayName}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
        {/* Small scroll dots indicator */}
        {categories.length > 1 && (
          <div className="sm:hidden flex justify-center gap-1.5 mt-4">
            {categories.map((_, index) => (
              <div
                key={index}
                className="w-1.5 h-1.5 rounded-full bg-gray-300"
              ></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

