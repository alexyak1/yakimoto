import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { Toaster, toast } from "react-hot-toast";
import { generateProductStructuredData, addStructuredDataToHead, updatePageMeta } from '../seo.jsx';
import { getImageUrl } from '../utils/imageUtils';
import { SmartImage } from './SmartImage';
import { NEW_PRODUCT_LABEL, SALE_LABEL, OUT_OF_STOCK_LABEL } from '../constants';

const API_URL = import.meta.env.VITE_API_URL;


export default function ProductDetailPage({ onAddToCart }) {
    const { id } = useParams();

    // ✅ All hooks defined unconditionally
    const [product, setProduct] = useState(null);
    const [selectedSize, setSelectedSize] = useState(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [sizeError, setSizeError] = useState(false);
    const [showSpecialOrder, setShowSpecialOrder] = useState(false);
    const [customSize, setCustomSize] = useState("");

    useEffect(() => {
        api.get(`/products/${id}`)
            .then(res => {
                setProduct(res.data);
                
                // Update page meta tags and canonical URL
                const productUrl = `https://yakimoto.se/products/${id}`;
                // Generate SEO-friendly title with Swedish keywords
                const productName = res.data.name || '';
                const category = res.data.category || '';
                const ageGroup = res.data.age_group || '';
                const color = res.data.color || '';
                
                // Build title with keywords
                let titleKeywords = '';
                if (category && category.toLowerCase().includes('gi')) {
                    titleKeywords = 'Judogi Sverige';
                } else if (category && category.toLowerCase().includes('dräkt')) {
                    titleKeywords = ageGroup && ageGroup.toLowerCase().includes('barn') 
                        ? 'Judo Dräkt Barn' 
                        : 'Judo Dräkt Vuxen';
                } else if (category && category.toLowerCase().includes('bälte')) {
                    titleKeywords = 'Judo Bälte';
                }
                
                const productTitle = `${productName} - ${titleKeywords || 'Judo Utrustning'} | Yakimoto Dojo`;
                
                // Generate SEO-friendly description
                let productDescription = res.data.description;
                if (!productDescription) {
                    // Auto-generate description based on product attributes
                    const parts = [];
                    if (category) parts.push(category);
                    if (color) parts.push(color);
                    if (ageGroup) {
                        parts.push(ageGroup === 'barn' || ageGroup === 'children' ? 'för barn' : 'för vuxna');
                    }
                    if (res.data.gsm) parts.push(`${res.data.gsm} GSM`);
                    
                    productDescription = `Köp ${productName}${parts.length > 0 ? ' - ' + parts.join(', ') : ''} från Yakimoto Dojo. Högkvalitativ judo utrustning. Snabb leverans från Sverige. Perfekt för träning och tävling.`;
                }
                
                updatePageMeta(productTitle, productDescription, productUrl);
                
                // Add structured data for SEO
                const structuredData = generateProductStructuredData(res.data);
                addStructuredDataToHead(structuredData);
            })
            .catch(err => console.error("Error loading product:", err));
    }, [id]);

    // Guard before rendering anything that depends on product
    if (!product) return <div className="p-4">Laddar...</div>;

    // Parse sizes, handling old format (number), intermediate format (object with quantity/location), and new format (location-based)
    const sizesRaw = JSON.parse(product.sizes || '{}');
    const sizes = Object.entries(sizesRaw).map(([size, value]) => {
        if (typeof value === 'object' && value !== null) {
            // New location-based format: {"online": 2, "club": 1}
            if ("online" in value || "club" in value) {
                const total = (value.online || 0) + (value.club || 0);
                return [size, total];
            }
            // Old intermediate format: {"quantity": 5, "location": "online"}
            else if ("quantity" in value) {
                return [size, value.quantity || 0];
            }
            else {
                return [size, 0];
            }
        } else {
            // Old format (just number)
            return [size, value || 0];
        }
    });
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

    const handleSpecialOrderAdd = () => {
        const trimmed = (customSize || "").trim();
        if (!trimmed) {
            toast.error("Ange önskad storlek");
            return;
        }

        // For custom orders, if product has discount, use full price (not sale price)
        const hasDiscount = product.sale_price && product.sale_price > 0 && product.sale_price < product.price;
        const productToAdd = {
            ...product,
            selectedSize: `${trimmed} (beställning)`,
            quantity: 1,
            available: 1,
            isSpecialOrder: true,
        };

        // If product has discount, remove sale_price so it uses full price
        if (hasDiscount) {
            productToAdd.sale_price = null;
        }

        const added = onAddToCart(productToAdd);

        if (added) {
            toast.success(`${product.name} (${trimmed}) beställning tillagd i varukorgen`);
            setCustomSize("");
            setShowSpecialOrder(false);
        } else {
            toast.error("Produkten med vald storlek finns redan i varukorgen.");
        }
    };





    return (
        <div className="max-w-7xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-10">
            {/* Images with selection */}
            <div className="flex flex-col items-center gap-4">
                <div className="w-full aspect-square overflow-hidden rounded-lg border">
                    <img
                        src={getImageUrl(images[selectedImageIndex])}
                        className="w-full h-full object-cover transition duration-300 ease-in-out"
                        alt={`Produktbild ${selectedImageIndex + 1}`}
                        loading="eager"
                    />
                </div>
                <div className="flex gap-2">
                    {images.map((img, idx) => (
                        <SmartImage
                            key={idx}
                            src={img}
                            onClick={() => setSelectedImageIndex(idx)}
                            className={`w-20 h-20 object-cover rounded cursor-pointer border-2 ${selectedImageIndex === idx ? 'border-black' : 'border-transparent'
                                }`}
                            loading="lazy"
                        />
                    ))}
                </div>
            </div>

            {/* Product info */}
            <div>
                {/* Badges row */}
                <div className="flex gap-2 mb-3">
                    {product.is_new && (
                        <span className="bg-green-600 text-white text-sm font-semibold px-3 py-1 rounded">
                            {NEW_PRODUCT_LABEL}
                        </span>
                    )}
                    {product.sale_price && product.sale_price > 0 && product.sale_price < product.price && (
                        <span className="bg-red-600 text-white text-sm font-semibold px-3 py-1 rounded">
                            {SALE_LABEL}
                        </span>
                    )}
                </div>
                
                <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                <div className="mb-4">
                  {product.sale_price && product.sale_price > 0 && product.sale_price < product.price ? (
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-2xl text-blue-700 font-bold">{product.sale_price} kr</p>
                      <p className="text-xl text-gray-400 line-through">{product.price} kr</p>
                      <span className="bg-red-600 text-white text-sm font-semibold px-3 py-1 rounded">
                        -{Math.round(((product.price - product.sale_price) / product.price) * 100)}%
                      </span>
                    </div>
                  ) : (
                    <p className="text-xl text-gray-800">{product.price} kr</p>
                  )}
                </div>
                
                {/* Product Description */}
                {product.description && (
                    <div className="mb-6 prose prose-sm max-w-none">
                        <div className="text-gray-700 whitespace-pre-line">
                            {product.description}
                        </div>
                    </div>
                )}
                
                {/* Product Details */}
                {(product.category || product.color || product.gsm || product.age_group) && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold mb-2">Produktdetaljer</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {product.category && (
                                <div>
                                    <span className="font-medium">Kategori:</span> {product.category}
                                </div>
                            )}
                            {product.color && (
                                <div>
                                    <span className="font-medium">Färg:</span> {product.color}
                                </div>
                            )}
                            {product.gsm && (
                                <div>
                                    <span className="font-medium">GSM:</span> {product.gsm}
                                </div>
                            )}
                            {product.age_group && (
                                <div>
                                    <span className="font-medium">Åldersgrupp:</span> {product.age_group}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="mb-4">
                    <h3 className="font-semibold mb-1">Storlek</h3>
                    <div className="flex gap-2 flex-wrap">
                        {sizes.map(([size, qty]) => {
                            let stockLabel = "";
                            if (qty === 0) stockLabel = OUT_OF_STOCK_LABEL;
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
                    <div className="mt-4 space-y-2">
                        {!showSpecialOrder ? (
                            <button
                                type="button"
                                onClick={() => setShowSpecialOrder(true)}
                                className="text-sm underline text-gray-700 hover:text-black"
                            >
                                Hittar du inte din storlek? Beställ den
                            </button>
                        ) : (
                            <div className="border rounded p-3 space-y-2">
                                <label className="text-sm font-medium">Önskad storlek</label>
                                <input
                                    type="text"
                                    value={customSize}
                                    onChange={(e) => setCustomSize(e.target.value)}
                                    placeholder="t.ex. 150 cm, S, 44, etc."
                                    className="w-full border rounded px-3 py-2"
                                />
                                {product.sale_price && product.sale_price > 0 && product.sale_price < product.price && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                                        <p className="text-sm text-yellow-800 font-medium">
                                            ⚠️ Specialbeställningar gäller fullpris: {product.price} kr
                                        </p>
                                        <p className="text-xs text-yellow-700 mt-1">
                                            Rabatten gäller endast för storlekar i lager.
                                        </p>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleSpecialOrderAdd}
                                        className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
                                    >
                                        Lägg i varukorg (beställning) – {product.sale_price && product.sale_price > 0 && product.sale_price < product.price ? product.price : (product.sale_price || product.price)} kr
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowSpecialOrder(false); setCustomSize(""); }}
                                        className="px-4 py-2 border rounded"
                                    >
                                        Avbryt
                                    </button>
                                </div>
                                <p className="text-xs text-gray-600">Vi kontaktar dig för leveranstid på specialbeställningar.</p>
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleAddToCart}
                    className="w-full bg-black text-white py-3 rounded hover:bg-gray-800 transition"
                >
                    Lägg i varukorg – {product.sale_price || product.price} kr
                </button>

                {selectedSize && sizes.find(([s]) => s === selectedSize)?.[1] === 0 && (
                    <p className="mt-4 text-red-600">{OUT_OF_STOCK_LABEL} för storlek {selectedSize}</p>
                )}
            </div>
        </div>
    );
}
