import React, { useState, useEffect } from "react";
import axios from "axios";
import { updatePageMeta } from '../seo.jsx';

const API_URL = import.meta.env.VITE_API_URL;

function AdminPage({ token, login }) {
    const [products, setProducts] = useState([]);
    const [name, setName] = useState("");
    const [price, setPrice] = useState(0);
    const [sizes, setSizes] = useState([{ size: '', quantity: 0 }]);
    const [imageFiles, setImageFiles] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [createSuccess, setCreateSuccess] = useState(false);
    const [password, setPassword] = useState("");
    const [editProductId, setEditProductId] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", price: "", sizes: [{ size: '', quantity: 0 }] });
    const [editImageFiles, setEditImageFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    useEffect(() => {
        fetchProducts();
        
        // Update page meta tags and canonical URL for admin page
        updatePageMeta(
            "Admin - Yakimoto Dojo | Produkthantering",
            "Administrativ panel för Yakimoto Dojo produkthantering.",
            "https://yakimoto.se/admin",
            "noindex, nofollow"
        );
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await axios.get(`${API_URL}/products`);

            const parsed = res.data.map((p) => ({
                ...p,
                sizes: JSON.parse(p.sizes || '{}'),
            }));
            setProducts(parsed);
        } catch (err) {
            console.error("Failed to fetch products", err);
        }
    };

    const handleCreate = async () => {
        setIsCreating(true);
        setCreateSuccess(false);
        
        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("price", price);

            formData.append("sizes", JSON.stringify(
                sizes.reduce((acc, cur) => {
                    if (cur.size.trim()) acc[cur.size] = cur.quantity;
                    return acc;
                }, {})
            ));
            for (let file of imageFiles) {
                formData.append("images", file);
            }

            await axios.post(`${API_URL}/products`, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setCreateSuccess(true);
            
            // reset form
            setName("");
            setPrice("");
            setSizes([{ size: '', quantity: 0 }]);
            setImageFiles([]);
            await fetchProducts();
            
            // Clear success message after 2 seconds
            setTimeout(() => {
                setCreateSuccess(false);
            }, 2000);
        } catch (error) {
            console.error("Failed to create product", error);
            alert("Kunde inte skapa produkt");
        } finally {
            setIsCreating(false);
        }
    };


    const deleteProduct = async (id) => {
        await axios.delete(`${API_URL}/products/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        fetchProducts();
    };

    const startEdit = (product) => {
        setEditProductId(product.id);

        const parsedSizes = Object.entries(product.sizes || {}).map(
            ([size, quantity]) => ({ size, quantity })
        );

        setEditForm({
            name: product.name,
            price: product.price,
            sizes: parsedSizes,
        });
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;

        if (name in editForm.sizes) {
            setEditForm((prev) => ({
                ...prev,
                sizes: {
                    ...prev.sizes,
                    [name]: parseInt(value, 10)
                }
            }));
        } else {
            setEditForm((prev) => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const submitEdit = async (id) => {
        setIsUploading(true);
        setUploadSuccess(false);
        
        try {
            const sizesObj = editForm.sizes.reduce((acc, cur) => {
                if (cur.size.trim()) acc[cur.size] = cur.quantity;
                return acc;
            }, {});

            const formData = new FormData();
            formData.append("name", editForm.name);
            formData.append("price", editForm.price);
            formData.append("sizes", JSON.stringify(sizesObj));
            for (let file of editImageFiles) {
                formData.append("images", file);
            }

            await axios.put(`${API_URL}/products/${id}`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setUploadSuccess(true);
            setEditImageFiles([]);
            await fetchProducts();
            
            // Clear success message after 3 seconds
            setTimeout(() => {
                setUploadSuccess(false);
                setEditProductId(null);
            }, 2000);
        } catch (error) {
            console.error("Failed to update product", error);
            alert("Kunde inte spara produkt");
            setIsUploading(false);
        } finally {
            setIsUploading(false);
        }
    };

    const updateEditSize = (index, field, value) => {
        setEditForm((prev) => {
            const newSizes = [...prev.sizes];
            newSizes[index] = { ...newSizes[index], [field]: field === "quantity" ? parseInt(value) : value };
            return { ...prev, sizes: newSizes };
        });
    };

    const addEditSize = () => {
        setEditForm((prev) => ({
            ...prev,
            sizes: [...prev.sizes, { size: "", quantity: 0 }],
        }));
    };

    const removeEditSize = (index) => {
        setEditForm((prev) => {
            const newSizes = [...prev.sizes];
            newSizes.splice(index, 1);
            return { ...prev, sizes: newSizes };
        });
    };

    const updateSize = (index, field, value) => {
        const updated = [...sizes];
        updated[index][field] = field === 'quantity' ? parseInt(value, 10) : value;
        setSizes(updated);
    };

    const removeSize = (index) => {
        const updated = [...sizes];
        updated.splice(index, 1);
        setSizes(updated);
    };

    const addSize = () => {
        setSizes([...sizes, { size: '', quantity: 0 }]);
    };

    if (!token) {
        return (
            <div className="p-4">
                <h2 className="text-lg font-semibold mb-2">Admin Login</h2>
                <input
                    type="password"
                    placeholder="Lösenord"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border p-1 mr-2"
                />
                <button
                    onClick={() => login(password)}
                    className="bg-blue-500 text-white px-3 py-1"
                >
                    Logga in
                </button>
            </div>
        );
    }
    if (!Array.isArray(products)) {
        return <div className="p-4 text-red-500">Produkter kunde inte laddas.</div>;
    }

    return (
        <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Admin Panel</h2>

            {/* Add New Product */}
            <div className="mb-6">
                <h3 className="font-semibold mb-2">Lägg till ny produkt</h3>

                <label className="block text-sm font-medium text-gray-700 mb-1">Namn</label>
                <input
                    type="text"
                    placeholder="Namn"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border p-1 mr-2"
                />

                <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">Pris</label>
                <input
                    type="number"
                    placeholder="Pris"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="border p-1 mr-2"
                />

                <div className="space-y-2 mt-2">
                    {sizes.map((entry, index) => (
                        <div key={index} className="flex gap-2 items-center">
                            <input
                                type="text"
                                placeholder="Storlek (t.ex. 170)"
                                value={entry.size}
                                onChange={(e) => updateSize(index, 'size', e.target.value)}
                                className="border p-2 rounded w-24"
                            />
                            <input
                                type="number"
                                placeholder="Antal"
                                value={entry.quantity}
                                min={0}
                                onChange={(e) => updateSize(index, 'quantity', e.target.value)}
                                className="border p-2 rounded w-24"
                            />
                            <button
                                type="button"
                                onClick={() => removeSize(index)}
                                className="text-red-600 hover:underline"
                            >
                                Ta bort
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addSize}
                        className="text-sm text-blue-600 hover:underline"
                    >
                        + Lägg till storlek
                    </button>
                </div>

                <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bild</label>
                    <input
                        type="file"
                        multiple
                        onChange={(e) => {
                            setImageFiles(Array.from(e.target.files));
                            setCreateSuccess(false);
                        }}
                        className="border p-1 mr-2"
                        disabled={isCreating}
                    />
                    {imageFiles.length > 0 && (
                        <div className="mt-2 text-sm text-gray-600">
                            {imageFiles.length} bild(er) valda: {imageFiles.map(f => f.name).join(", ")}
                        </div>
                    )}
                    {isCreating && (
                        <div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
                            <span className="animate-spin">⏳</span>
                            Laddar upp bilder...
                        </div>
                    )}
                    {createSuccess && (
                        <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                            <span>✓</span>
                            Produkt skapad och bilder uppladdade!
                        </div>
                    )}
                </div>
                <button 
                    onClick={handleCreate} 
                    disabled={isCreating}
                    className={`px-3 py-1 mt-2 ${isCreating ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600'} text-white`}
                >
                    {isCreating ? 'Laddar...' : 'Skapa produkt'}
                </button>
            </div>

            {/* Existing Products */}
            <div>
                <h3 className="font-semibold mb-2">Befintliga produkter</h3>
                {products.map((product) => (
                    <div key={product.id} className="border p-2 mb-2">
                        {editProductId === product.id ? (
                            <div>
                                <input
                                    name="name"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                                    className="border p-1 mr-2"
                                />
                                <input
                                    name="price"
                                    value={editForm.price}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, price: e.target.value }))}
                                    className="border p-1 mr-2"
                                />
                                {editForm.sizes.map((entry, index) => (
                                    <div key={index} className="flex gap-2 items-center mt-1">
                                        <input
                                            type="text"
                                            value={entry.size}
                                            onChange={(e) => updateEditSize(index, 'size', e.target.value)}
                                            className="border p-1 w-20"
                                        />
                                        <input
                                            type="number"
                                            value={entry.quantity}
                                            onChange={(e) => updateEditSize(index, 'quantity', e.target.value)}
                                            className="border p-1 w-20"
                                        />
                                        <button
                                            onClick={() => removeEditSize(index)}
                                            className="text-red-600 hover:underline"
                                        >
                                            Ta bort
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={addEditSize}
                                    className="text-sm text-blue-600 hover:underline mt-1"
                                >
                                    + Lägg till storlek
                                </button>
                                {product.images && product.images.length > 0 && (
                                    <div className="mt-2 flex gap-2 flex-wrap">
                                        {product.images.map((img, idx) => (
                                            <img
                                                key={idx}
                                                src={`${API_URL}/uploads/${img}`}
                                                alt="Produktbild"
                                                className="w-20 h-20 object-cover border"
                                            />
                                        ))}
                                    </div>
                                )}
                                <div className="mt-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Lägg till nya bilder</label>
                                    <input
                                        type="file"
                                        multiple
                                        onChange={(e) => {
                                            setEditImageFiles(Array.from(e.target.files));
                                            setUploadSuccess(false);
                                        }}
                                        className="border p-1"
                                        disabled={isUploading}
                                    />
                                    {editImageFiles.length > 0 && (
                                        <div className="mt-2 text-sm text-gray-600">
                                            {editImageFiles.length} bild(er) valda: {editImageFiles.map(f => f.name).join(", ")}
                                        </div>
                                    )}
                                    {isUploading && (
                                        <div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
                                            <span className="animate-spin">⏳</span>
                                            Laddar upp bilder...
                                        </div>
                                    )}
                                    {uploadSuccess && (
                                        <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                                            <span>✓</span>
                                            Bilder uppladdade!
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2">
                                    <button 
                                        onClick={() => submitEdit(product.id)} 
                                        disabled={isUploading}
                                        className={`px-2 py-1 mr-1 ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600'} text-white`}
                                    >
                                        {isUploading ? 'Laddar...' : 'Spara'}
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setEditProductId(null);
                                            setEditImageFiles([]);
                                            setUploadSuccess(false);
                                        }} 
                                        disabled={isUploading}
                                        className="bg-gray-400 text-white px-2 py-1"
                                    >
                                        Avbryt
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p>{product.name} – {product.price} SEK</p>
                                <p className="text-sm text-gray-600">Lager: {JSON.stringify(product.sizes)}</p>
                                <button onClick={() => startEdit(product)} className="bg-yellow-500 text-white px-2 py-1 mr-1">Redigera</button>
                                <button onClick={() => deleteProduct(product.id)} className="bg-red-600 text-white px-2 py-1">Ta bort</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
export default AdminPage;
