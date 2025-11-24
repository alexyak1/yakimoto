import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const API_URL = import.meta.env.VITE_API_URL;

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
    <div className="w-full mb-12 relative">
      <h2 className="text-2xl font-bold mb-6 px-6">Kategorier</h2>
      <div className="relative">
        <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-0 overflow-x-auto sm:overflow-x-visible snap-x snap-mandatory sm:snap-none scrollbar-hide px-6 sm:px-0">
          {categories.map((category) => {
            const imageSrc = category.image_filename 
              ? `${API_URL}/uploads/${category.image_filename}` 
              : null;

            const displayName = category.name 
              ? category.name.charAt(0).toUpperCase() + category.name.slice(1)
              : 'Kategori';

            return (
              <Link
                key={category.id || category.name}
                to={`/category/${category.name}`}
                className="group relative overflow-hidden h-[600px] hover:opacity-95 transition-opacity duration-300 flex-shrink-0 w-[75vw] sm:w-auto snap-start sm:snap-none"
              >
                <div className="w-full h-full overflow-hidden bg-gray-100">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt={displayName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                      Ingen bild
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                  <h3 className="text-white font-bold text-xl mb-1">
                    {displayName}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
        {/* Small scroll dots indicator */}
        {categories.length > 1 && (
          <div className="sm:hidden flex justify-center gap-1.5 mt-4 px-6">
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

