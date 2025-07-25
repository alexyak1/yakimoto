import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { Toaster, toast } from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL;


export default function ProductDetailPage({ onAddToCart }) {
    const { id } = useParams();

    // ✅ All hooks defined unconditionally
    const [product, setProduct] = useState(null);
    const [selectedSize, setSelectedSize] = useState(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [sizeError, setSizeError] = useState(false);

    useEffect(() => {
        api.get(`/products/${id}`)
            .then(res => setProduct(res.data))
            .catch(err => console.error("Error loading product:", err));
    }, [id]);

    // Guard before rendering anything that depends on product
    if (!product) return <div className="p-4">Laddar...</div>;

    const sizes = Object.entries(JSON.parse(product.sizes || '{}'));
    const images = product.images || [];

    const handleAddToCart = () => {
        if (!selectedSize) {
            setSizeError(true);
            toast.error("Välj en storlek först");
            return;
        }

        setSizeError(false);

        const added = onAddToCart({
            ...product,
            selectedSize,
            quantity: 1,
            available: sizes.find(([s]) => s === selectedSize)?.[1] || 0,
        });

        if (added) {
            toast.success(`${product.name} (${selectedSize}) tillagd i varukorgen`);
        } else {
            toast.error("Produkten med vald storlek finns redan i varukorgen. Gå till varukorgen för att ändra antal.");
        }
    };





    return (
        <div className="max-w-7xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-10">
            {/* Images with selection */}
            <div className="flex flex-col items-center gap-4">
                <div className="w-full aspect-square overflow-hidden rounded-lg border">
                    <img
                        src={`${API_URL}/uploads/${images[selectedImageIndex]}`}
                        className="w-full h-full object-cover transition duration-300 ease-in-out"
                        alt={`Produktbild ${selectedImageIndex + 1}`}
                    />
                </div>
                <div className="flex gap-2">
                    {images.map((img, idx) => (
                        <img
                            key={idx}
                            src={`${API_URL}/uploads/${img}`}
                            onClick={() => setSelectedImageIndex(idx)}
                            className={`w-20 h-20 object-cover rounded cursor-pointer border-2 ${selectedImageIndex === idx ? 'border-black' : 'border-transparent'
                                }`}
                        />
                    ))}
                </div>
            </div>

            {/* Product info */}
            <div>
                <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                <p className="text-xl text-gray-800 mb-4">{product.price} kr</p>

                <div className="mb-4">
                    <h3 className="font-semibold mb-1">Storlek</h3>
                    <div className="flex gap-2 flex-wrap">
                        {sizes.map(([size, qty]) => {
                            let stockLabel = "";
                            if (qty === 0) stockLabel = "Slut i lager";
                            else if (qty <= 2) stockLabel = "Få kvar";
                            else stockLabel = "I lager";

                            return (
                                <div key={size} className="flex flex-col items-center">
                                    <button
                                        disabled={qty <= 0}
                                        onClick={() => {
                                            setSelectedSize(size);
                                            setSizeError(false);
                                        }}
                                        className={`px-4 py-2 border rounded ${selectedSize === size
                                            ? 'border-black bg-black text-white'
                                            : 'border-gray-300'
                                            } ${qty === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    >
                                        {size}
                                    </button>
                                    <span className={`text-xs mt-1 ${qty === 0 ? 'text-red-500' : qty <= 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                                        {stockLabel}
                                    </span>
                                </div>
                            );
                        })}
                        {sizeError && (
                            <p className="text-sm text-red-600 mt-2">
                                Du måste välja en storlek innan du kan lägga i varukorgen.
                            </p>
                        )}

                    </div>
                </div>

                <button
                    onClick={handleAddToCart}
                    className="w-full bg-black text-white py-3 rounded hover:bg-gray-800 transition"
                >
                    Lägg i varukorg – {product.price} kr
                </button>

                {selectedSize && sizes.find(([s]) => s === selectedSize)?.[1] === 0 && (
                    <p className="mt-4 text-red-600">Slut i lager för storlek {selectedSize}</p>
                )}
            </div>
        </div>
    );
}
