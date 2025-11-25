import React, { useState, useEffect } from "react";
import axios from "axios";
import { updatePageMeta } from '../seo.jsx';
import { getImageUrl } from '../utils/imageUtils';
import { SmartImage } from './SmartImage';

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
    const [editForm, setEditForm] = useState({ name: "", price: "", sizes: [{ size: '', quantity: 0 }], category: "", color: "", gsm: "", age_group: "" });
    const [editImageFiles, setEditImageFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [category, setCategory] = useState("");
    const [color, setColor] = useState("");
    const [gsm, setGsm] = useState("");
    const [ageGroup, setAgeGroup] = useState("");
    const [categories, setCategories] = useState([]);
    const [categoryName, setCategoryName] = useState("");
    const [categoryImage, setCategoryImage] = useState(null);
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [editCategoryId, setEditCategoryId] = useState(null);
    const [editCategoryName, setEditCategoryName] = useState("");
    const [editCategoryImage, setEditCategoryImage] = useState(null);
    const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
    const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
    const [thumbnailResult, setThumbnailResult] = useState(null);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
        
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

    const fetchCategories = async () => {
        try {
            const res = await axios.get(`${API_URL}/categories`);
            setCategories(res.data);
        } catch (err) {
            console.error("Failed to fetch categories", err);
        }
    };

    const handleCreateCategory = async () => {
        if (!categoryName.trim()) {
            alert("Kategori namn krävs");
            return;
        }
        
        setIsCreatingCategory(true);
        try {
            const formData = new FormData();
            formData.append("name", categoryName);
            if (categoryImage) {
                formData.append("image", categoryImage);
            }

            await axios.post(`${API_URL}/categories`, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setCategoryName("");
            setCategoryImage(null);
            await fetchCategories();
            alert("Kategori skapad/uppdaterad!");
        } catch (error) {
            console.error("Failed to create category", error);
            alert("Kunde inte skapa kategori");
        } finally {
            setIsCreatingCategory(false);
        }
    };

    const handleDeleteCategory = async (categoryName) => {
        if (!confirm(`Är du säker på att du vill ta bort kategorin "${categoryName}"?`)) {
            return;
        }
        
        try {
            await axios.delete(`${API_URL}/categories/${categoryName}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            await fetchCategories();
        } catch (error) {
            console.error("Failed to delete category", error);
            alert("Kunde inte ta bort kategori");
        }
    };

    const startEditCategory = (category) => {
        setEditCategoryId(category.id);
        setEditCategoryName(category.name);
        setEditCategoryImage(null);
    };

    const cancelEditCategory = () => {
        setEditCategoryId(null);
        setEditCategoryName("");
        setEditCategoryImage(null);
    };

    const handleUpdateCategory = async (categoryId) => {
        if (!editCategoryName.trim()) {
            alert("Kategori namn krävs");
            return;
        }
        
        setIsUpdatingCategory(true);
        try {
            const formData = new FormData();
            formData.append("name", editCategoryName);
            if (editCategoryImage) {
                formData.append("image", editCategoryImage);
            }

            await axios.put(`${API_URL}/categories/${categoryId}`, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setEditCategoryId(null);
            setEditCategoryName("");
            setEditCategoryImage(null);
            await fetchCategories();
            alert("Kategori uppdaterad!");
        } catch (error) {
            console.error("Failed to update category", error);
            alert("Kunde inte uppdatera kategori");
        } finally {
            setIsUpdatingCategory(false);
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
            if (category) formData.append("category", category);
            if (color) formData.append("color", color);
            if (gsm) formData.append("gsm", gsm);
            if (ageGroup) formData.append("age_group", ageGroup);
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
            setCategory("");
            setColor("");
            setGsm("");
            setAgeGroup("");
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

    const handleSetMainImage = async (productId, filename) => {
        try {
            const formData = new FormData();
            formData.append("filename", filename);
            
            await axios.post(`${API_URL}/products/${productId}/set-main-image`, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            await fetchProducts();
        } catch (error) {
            console.error("Failed to set main image", error);
            alert("Kunde inte uppdatera huvudbild");
        }
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
            category: product.category || "",
            color: product.color || "",
            gsm: product.gsm || "",
            age_group: product.age_group || "",
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
            if (editForm.category) formData.append("category", editForm.category);
            if (editForm.color) formData.append("color", editForm.color);
            if (editForm.gsm) formData.append("gsm", editForm.gsm);
            if (editForm.age_group) formData.append("age_group", editForm.age_group);
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
            
            // Clear success message after 3 seconds, but keep form open for more uploads
            setTimeout(() => {
                setUploadSuccess(false);
            }, 3000);
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

            {/* Image Utilities */}
            <div className="mb-6 p-4 border rounded bg-gray-50">
                <h3 className="font-semibold mb-2">Bildverktyg</h3>
                <p className="text-sm text-gray-600 mb-3">
                    Generera miniatyrer för alla befintliga bilder. Detta förbättrar laddningstiderna på produktsidor.
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                    <button
                        onClick={async () => {
                            setIsGeneratingThumbnails(true);
                            setThumbnailResult(null);
                            try {
                                const res = await axios.get(
                                    `${API_URL}/admin/thumbnail-status`,
                                    {
                                        headers: {
                                            Authorization: `Bearer ${token}`
                                        }
                                    }
                                );
                                const status = res.data;
                                setThumbnailResult({
                                    message: `Miniatyrstatus: ${status.thumbnail_count} av ${status.total} bilder har miniatyrer`,
                                    processed: status.thumbnail_count,
                                    skipped: status.without_thumbnails.length,
                                    total: status.total,
                                    errors: status.missing_originals.length > 0 
                                        ? [`Saknade originalbilder: ${status.missing_originals.length}`]
                                        : [],
                                    details: {
                                        with_thumbnails: status.with_thumbnails.length,
                                        without_thumbnails: status.without_thumbnails.length,
                                        missing_originals: status.missing_originals.length
                                    }
                                });
                            } catch (err) {
                                setThumbnailResult({
                                    message: "Fel uppstod vid kontroll",
                                    errors: [err.response?.data?.detail || err.message || "Okänt fel"]
                                });
                            } finally {
                                setIsGeneratingThumbnails(false);
                            }
                        }}
                        disabled={isGeneratingThumbnails}
                        className={`px-4 py-2 ${isGeneratingThumbnails ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded`}
                    >
                        Kontrollera miniatyrstatus
                    </button>
                    <button
                        onClick={async () => {
                            if (!confirm('Är du säker på att du vill ta bort alla miniatyrer? Detta gör att du kan generera nya med korrekt orientering.')) {
                                return;
                            }
                            setIsGeneratingThumbnails(true);
                            setThumbnailResult(null);
                            try {
                                const res = await axios.post(
                                    `${API_URL}/admin/delete-thumbnails`,
                                    {},
                                    {
                                        headers: {
                                            Authorization: `Bearer ${token}`
                                        }
                                    }
                                );
                                setThumbnailResult({
                                    message: `Raderade ${res.data.deleted} miniatyrer`,
                                    processed: res.data.deleted,
                                    errors: res.data.errors || []
                                });
                            } catch (err) {
                                setThumbnailResult({
                                    message: "Fel uppstod vid radering",
                                    errors: [err.response?.data?.detail || err.message || "Okänt fel"]
                                });
                            } finally {
                                setIsGeneratingThumbnails(false);
                            }
                        }}
                        disabled={isGeneratingThumbnails}
                        className={`px-4 py-2 ${isGeneratingThumbnails ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} text-white rounded`}
                    >
                        {isGeneratingThumbnails ? 'Raderar...' : 'Ta bort alla miniatyrer'}
                    </button>
                    <button
                        onClick={async () => {
                            setIsGeneratingThumbnails(true);
                            setThumbnailResult(null);
                            try {
                                const res = await axios.post(
                                    `${API_URL}/admin/generate-thumbnails`,
                                    {},
                                    {
                                        headers: {
                                            Authorization: `Bearer ${token}`
                                        }
                                    }
                                );
                                setThumbnailResult(res.data);
                            } catch (err) {
                                setThumbnailResult({
                                    message: "Fel uppstod",
                                    errors: [err.response?.data?.detail || err.message || "Okänt fel"]
                                });
                            } finally {
                                setIsGeneratingThumbnails(false);
                            }
                        }}
                        disabled={isGeneratingThumbnails}
                        className={`px-4 py-2 ${isGeneratingThumbnails ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded`}
                    >
                        {isGeneratingThumbnails ? 'Genererar miniatyrer...' : 'Generera miniatyrer för alla bilder'}
                    </button>
                </div>
                {thumbnailResult && (
                    <div className={`mt-3 p-3 rounded ${thumbnailResult.errors && thumbnailResult.errors.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                        <p className="font-medium">{thumbnailResult.message}</p>
                        {thumbnailResult.details && (
                            <div className="text-sm mt-2 space-y-1">
                                <p>✓ Med miniatyrer: {thumbnailResult.details.with_thumbnails}</p>
                                <p>✗ Utan miniatyrer: {thumbnailResult.details.without_thumbnails}</p>
                                {thumbnailResult.details.missing_originals > 0 && (
                                    <p className="text-yellow-700">⚠ Saknade originalbilder: {thumbnailResult.details.missing_originals}</p>
                                )}
                            </div>
                        )}
                        {!thumbnailResult.details && (
                            <p className="text-sm mt-1">
                                Bearbetade: {thumbnailResult.processed || 0} | 
                                Hoppade över: {thumbnailResult.skipped || 0} | 
                                Totalt: {thumbnailResult.total || 0}
                            </p>
                        )}
                        {thumbnailResult.errors && thumbnailResult.errors.length > 0 && (
                            <div className="mt-2">
                                <p className="text-sm font-medium text-yellow-800">Fel:</p>
                                <ul className="text-sm text-yellow-700 list-disc list-inside">
                                    {thumbnailResult.errors.slice(0, 5).map((error, idx) => (
                                        <li key={idx}>{error}</li>
                                    ))}
                                    {thumbnailResult.errors.length > 5 && (
                                        <li>... och {thumbnailResult.errors.length - 5} fler fel</li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Category Management */}
            <div className="mb-8 border-b pb-6">
                <h3 className="font-semibold mb-4 text-xl">Kategorihantering</h3>
                
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Namn</label>
                    <input
                        type="text"
                        placeholder="t.ex. judo gi"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        className="border p-2 rounded w-64 mr-2"
                    />
                </div>
                
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Bild</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setCategoryImage(e.target.files[0] || null)}
                        className="border p-1"
                    />
                    {categoryImage && (
                        <div className="mt-2 text-sm text-gray-600">
                            Vald bild: {categoryImage.name}
                        </div>
                    )}
                </div>
                
                <button
                    onClick={handleCreateCategory}
                    disabled={isCreatingCategory}
                    className={`px-4 py-2 ${isCreatingCategory ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600'} text-white rounded`}
                >
                    {isCreatingCategory ? 'Laddar...' : 'Skapa/Uppdatera Kategori'}
                </button>

                {/* Existing Categories */}
                <div className="mt-6">
                    <h4 className="font-semibold mb-2">Befintliga kategorier</h4>
                    {categories.length === 0 ? (
                        <p className="text-gray-500 text-sm">Inga kategorier ännu</p>
                    ) : (
                        <div className="space-y-2">
                            {categories.map((cat) => (
                                <div key={cat.id} className="border p-3 rounded">
                                    {editCategoryId === cat.id ? (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Namn</label>
                                                <input
                                                    type="text"
                                                    value={editCategoryName}
                                                    onChange={(e) => setEditCategoryName(e.target.value)}
                                                    className="border p-2 rounded w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Bild</label>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => setEditCategoryImage(e.target.files[0] || null)}
                                                    className="border p-1"
                                                />
                                                {editCategoryImage && (
                                                    <div className="mt-2 text-sm text-gray-600">
                                                        Ny bild vald: {editCategoryImage.name}
                                                    </div>
                                                )}
                                                {cat.image_filename && !editCategoryImage && (
                                                    <div className="mt-2">
                                                        <p className="text-sm text-gray-600 mb-1">Nuvarande bild:</p>
                                                        <SmartImage
                                                            src={cat.image_filename}
                                                            alt={cat.name}
                                                            className="w-32 h-32 object-cover rounded"
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleUpdateCategory(cat.id)}
                                                    disabled={isUpdatingCategory}
                                                    className={`px-4 py-2 ${isUpdatingCategory ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600'} text-white rounded text-sm`}
                                                >
                                                    {isUpdatingCategory ? 'Sparar...' : 'Spara'}
                                                </button>
                                                <button
                                                    onClick={cancelEditCategory}
                                                    disabled={isUpdatingCategory}
                                                    className="px-4 py-2 bg-gray-400 text-white rounded text-sm"
                                                >
                                                    Avbryt
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <p className="font-medium">{cat.name}</p>
                                                {cat.image_filename && (
                                                    <SmartImage
                                                        src={cat.image_filename}
                                                        alt={cat.name}
                                                        className="w-32 h-32 object-cover mt-2 rounded"
                                                        loading="lazy"
                                                    />
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => startEditCategory(cat)}
                                                    className="bg-yellow-500 text-white px-3 py-1 rounded text-sm"
                                                >
                                                    Redigera
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCategory(cat.name)}
                                                    className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                                                >
                                                    Ta bort
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

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

                <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">Kategori (t.ex. "judo gi")</label>
                <input
                    type="text"
                    placeholder="Kategori"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="border p-1 mr-2"
                />

                <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">Färg (t.ex. "blue", "white")</label>
                <input
                    type="text"
                    placeholder="Färg"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="border p-1 mr-2"
                />

                <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">GSM (t.ex. "550", "750")</label>
                <input
                    type="text"
                    placeholder="GSM"
                    value={gsm}
                    onChange={(e) => setGsm(e.target.value)}
                    className="border p-1 mr-2"
                />

                <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">Åldersgrupp (t.ex. "children", "adult")</label>
                <input
                    type="text"
                    placeholder="Åldersgrupp"
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value)}
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
                                <div className="mt-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                                    <input
                                        name="category"
                                        value={editForm.category}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                                        className="border p-1 mr-2"
                                        placeholder="Kategori"
                                    />
                                </div>
                                <div className="mt-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Färg</label>
                                    <input
                                        name="color"
                                        value={editForm.color}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, color: e.target.value }))}
                                        className="border p-1 mr-2"
                                        placeholder="Färg"
                                    />
                                </div>
                                <div className="mt-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">GSM</label>
                                    <input
                                        name="gsm"
                                        value={editForm.gsm}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, gsm: e.target.value }))}
                                        className="border p-1 mr-2"
                                        placeholder="GSM"
                                    />
                                </div>
                                <div className="mt-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Åldersgrupp</label>
                                    <input
                                        name="age_group"
                                        value={editForm.age_group}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, age_group: e.target.value }))}
                                        className="border p-1 mr-2"
                                        placeholder="Åldersgrupp"
                                    />
                                </div>
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
                                    <div className="mt-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Bilder (klicka för att välja huvudbild)</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {product.images.map((img, idx) => {
                                                const isMain = product.main_image === img || (idx === 0 && !product.main_image);
                                                return (
                                                    <div key={idx} className="relative">
                                                        <SmartImage
                                                            src={img}
                                                            alt="Produktbild"
                                                            onClick={() => handleSetMainImage(product.id, img)}
                                                            className={`w-20 h-20 object-cover border-2 cursor-pointer hover:opacity-80 transition ${
                                                                isMain ? 'border-blue-600 border-4' : 'border-gray-300'
                                                            }`}
                                                            loading="lazy"
                                                        />
                                                        {isMain && (
                                                            <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs px-1 rounded-bl">
                                                                Huvud
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                <div className="mt-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Lägg till nya bilder</label>
                                    <input
                                        type="file"
                                        multiple
                                        onChange={(e) => {
                                            const newFiles = Array.from(e.target.files);
                                            setEditImageFiles(prev => [...prev, ...newFiles]);
                                            setUploadSuccess(false);
                                            // Reset input to allow selecting same file again
                                            e.target.value = '';
                                        }}
                                        className="border p-1"
                                        disabled={isUploading}
                                    />
                                    {editImageFiles.length > 0 && (
                                        <div className="mt-2">
                                            <div className="text-sm text-gray-600 mb-2">
                                                {editImageFiles.length} bild(er) valda:
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {editImageFiles.map((file, index) => (
                                                    <div key={index} className="relative border rounded p-2 bg-gray-50">
                                                        <div className="text-xs text-gray-700 max-w-[150px] truncate">
                                                            {file.name}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditImageFiles(prev => prev.filter((_, i) => i !== index));
                                                            }}
                                                            className="absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 rounded-full hover:bg-red-600"
                                                            disabled={isUploading}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
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
