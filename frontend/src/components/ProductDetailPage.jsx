import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

export default function ProductDetailPage({ onAddToCart }) {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [selectedSize, setSelectedSize] = useState(null);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        api.get(`/products/${id}`)
            .then(res => setProduct(res.data))
            .catch(err => console.error("Error loading product:", err));
    }, [id]);

    if (!product) return <div className="p-4">Laddar...</div>;

    const sizes = Object.entries(JSON.parse(product.sizes || '{}'));

    const handleAddToCart = () => {
        if (!selectedSize) return alert("Välj en storlek först!");
        onAddToCart({ ...product, selectedSize, quantity });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-10">
            {/* Left: Image */}
            <div className="rounded-lg overflow-hidden shadow">
                <img
                    src={`http://localhost:8000/uploads/${product.image}`}
                    alt={product.name}
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Right: Info */}
            <div>
                <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                <p className="text-xl text-gray-800 mb-4">{product.price} kr</p>

                <div className="mb-4">
                    <h3 className="font-semibold mb-1">Storlek</h3>
                    <div className="flex gap-2 flex-wrap">
                        {sizes.map(([size, qty]) => (
                            <button
                                key={size}
                                disabled={qty <= 0}
                                onClick={() => setSelectedSize(size)}
                                className={`px-4 py-2 border rounded ${selectedSize === size
                                        ? 'border-black bg-black text-white'
                                        : 'border-gray-300'
                                    } ${qty === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="font-semibold mb-1">Antal</h3>
                    <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="border px-3 py-2 w-20 rounded"
                    />
                </div>

                <button
                    onClick={handleAddToCart}
                    className="w-full bg-black text-white py-3 rounded hover:bg-gray-800 transition"
                >
                    Lägg i varukorg – {product.price * quantity} kr
                </button>

                {selectedSize && sizes.find(([s]) => s === selectedSize)?.[1] === 0 && (
                    <p className="mt-4 text-red-600">Slut i lager för storlek {selectedSize}</p>
                )}
            </div>
        </div>
    );
}
