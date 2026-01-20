import React, { useState, useEffect } from "react";
import axios from "axios";
import { updatePageMeta } from '../seo.jsx';
import { getImageUrl } from '../utils/imageUtils';
import { SmartImage } from './SmartImage';
import { isTokenValid, isTokenExpired } from '../utils/auth';

const API_URL = import.meta.env.VITE_API_URL;

function AdminPage({ token, login }) {
    const [products, setProducts] = useState([]);
    const [name, setName] = useState("");
    const [price, setPrice] = useState(0);
    const [sizes, setSizes] = useState([{ size: '', quantity: 0, location: 'online' }]);
    const [imageFiles, setImageFiles] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [createSuccess, setCreateSuccess] = useState(false);
    const [password, setPassword] = useState("");
    const [editProductId, setEditProductId] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", price: "", sizes: [{ size: '', quantity: 0 }], category: "", color: "", gsm: "", age_group: "", description: "", sale_price: "", discount_percent: "", sale_type: "percent", category_ids: [] });
    const [editImageFiles, setEditImageFiles] = useState([]);
    const [description, setDescription] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [category, setCategory] = useState("");
    const [color, setColor] = useState("");
    const [gsm, setGsm] = useState("");
    const [ageGroup, setAgeGroup] = useState("");
    const [salePrice, setSalePrice] = useState("");
    const [discountPercent, setDiscountPercent] = useState("");
    const [saleType, setSaleType] = useState("percent"); // "percent" or "price"
    const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
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
    const [isReorderingCategories, setIsReorderingCategories] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [showCreateProductModal, setShowCreateProductModal] = useState(false);
    const [moveInventory, setMoveInventory] = useState(null); // {productId, size, fromLocation, maxQty}

    useEffect(() => {
        // Check token validity on mount and periodically
        if (token && isTokenExpired(token)) {
            // Token expired - it will be cleared by App.jsx
            return;
        }

        // Fetch data (products and categories are public, but we check token for admin operations)
        fetchProducts();
        fetchCategories();
        
        // Update page meta tags and canonical URL for admin page
        updatePageMeta(
            "Admin - Yakimoto Dojo | Produkthantering",
            "Administrativ panel för Yakimoto Dojo produkthantering.",
            "https://yakimoto.se/admin",
            "noindex, nofollow"
        );
    }, [token]);

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
            // URL encode the category name to handle special characters and spaces
            const encodedName = encodeURIComponent(categoryName);
            console.log("Deleting category:", categoryName, "encoded:", encodedName);
            await axios.delete(`${API_URL}/categories/${encodedName}`, {
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

    const moveCategory = (index, direction) => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === categories.length - 1) return;
        
        const newCategories = [...categories];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        [newCategories[index], newCategories[newIndex]] = [newCategories[newIndex], newCategories[index]];
        setCategories(newCategories);
    };

    const saveCategoryOrder = async () => {
        setIsReorderingCategories(true);
        try {
            const categoryOrders = {};
            categories.forEach((cat, index) => {
                categoryOrders[cat.id] = index;
            });
            
            await axios.post(`${API_URL}/categories/reorder`, categoryOrders, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            await fetchCategories();
            alert("Kategoriordning sparad!");
        } catch (error) {
            console.error("Failed to save category order", error);
            alert("Kunde inte spara kategoriordning");
            // Revert to server state on error
            await fetchCategories();
        } finally {
            setIsReorderingCategories(false);
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
                    if (cur.size.trim()) {
                        // Group by size and accumulate by location
                        if (!acc[cur.size]) {
                            acc[cur.size] = { online: 0, club: 0 };
                        }
                        const location = cur.location || 'online';
                        acc[cur.size][location] = (acc[cur.size][location] || 0) + cur.quantity;
                    }
                    return acc;
                }, {})
            ));
            if (category) formData.append("category", category);
            if (selectedCategoryIds.length > 0) {
                formData.append("category_ids", selectedCategoryIds.join(','));
            }
            if (color) formData.append("color", color);
            if (gsm) formData.append("gsm", gsm);
            if (ageGroup) formData.append("age_group", ageGroup);
            if (description) formData.append("description", description);
            if (discountPercent && discountPercent !== "" && discountPercent !== "0") {
                formData.append("discount_percent", discountPercent);
            } else if (salePrice && salePrice !== "" && salePrice !== "0") {
                formData.append("sale_price", salePrice);
            }
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
            setSizes([{ size: '', quantity: 0, location: 'online' }]);
            setImageFiles([]);
            setCategory("");
            setColor("");
            setGsm("");
            setAgeGroup("");
            setDescription("");
            setSalePrice("");
            setDiscountPercent("");
            setSaleType("percent");
            setSelectedCategoryIds([]);
            await fetchProducts();
            
            // Clear success message after 2 seconds, then close modal
            setTimeout(() => {
                setCreateSuccess(false);
                setShowCreateProductModal(false);
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
            // Optimistically update the local state immediately
            setProducts(prevProducts => 
                prevProducts.map(product => 
                    product.id === productId 
                        ? { ...product, main_image: filename }
                        : product
                )
            );
            
            const formData = new FormData();
            formData.append("filename", filename);
            
            await axios.post(`${API_URL}/products/${productId}/set-main-image`, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            // Fetch fresh data from server to ensure consistency
            await fetchProducts();
        } catch (error) {
            console.error("Failed to set main image", error);
            alert("Kunde inte uppdatera huvudbild");
            // Revert optimistic update on error
            await fetchProducts();
        }
    };

    const handleDeleteImage = async (productId, filename) => {
        if (!confirm(`Är du säker på att du vill ta bort denna bild?`)) {
            return;
        }
        
        try {
            // URL encode the filename to handle special characters
            const encodedFilename = encodeURIComponent(filename);
            await axios.delete(`${API_URL}/products/${productId}/images/${encodedFilename}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            // Fetch fresh data from server
            await fetchProducts();
        } catch (error) {
            console.error("Failed to delete image", error);
            alert("Kunde inte ta bort bild");
        }
    };

    const startEdit = (product) => {
        setEditProductId(product.id);

        // Parse sizes - new format supports multiple locations per size: {"160": {"online": 2, "club": 1}}
        const parsedSizes = [];
        Object.entries(product.sizes || {}).forEach(([size, value]) => {
            if (typeof value === 'object' && value !== null) {
                // New location-based format: {"online": 2, "club": 1}
                if ("online" in value || "club" in value) {
                    if (value.online && value.online > 0) {
                        parsedSizes.push({ size, quantity: value.online, location: 'online' });
                    }
                    if (value.club && value.club > 0) {
                        parsedSizes.push({ size, quantity: value.club, location: 'club' });
                    }
                }
                // Old intermediate format: {"quantity": 5, "location": "online"}
                else if ("quantity" in value) {
                    parsedSizes.push({ size, quantity: value.quantity || 0, location: value.location || 'online' });
                }
            } else {
                // Old format (just number) - convert to online
                parsedSizes.push({ size, quantity: value || 0, location: 'online' });
            }
        });

        // Get category IDs from product categories
        const categoryIds = product.categories ? product.categories.map(c => c.id) : [];
        console.log("Loading product for edit:", product.name, "categories:", product.categories, "categoryIds:", categoryIds);

        setEditForm({
            name: product.name,
            price: product.price,
            sizes: parsedSizes,
            category: product.category || "",
            color: product.color || "",
            gsm: product.gsm || "",
            age_group: product.age_group || "",
            description: product.description || "",
            sale_price: product.sale_price || "",
            discount_percent: product.discount_percent || "",
            sale_type: product.discount_percent ? "percent" : "price",
            category_ids: categoryIds,
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
                if (cur.size.trim()) {
                    // Group by size and accumulate by location
                    if (!acc[cur.size]) {
                        acc[cur.size] = { online: 0, club: 0 };
                    }
                    const location = cur.location || 'online';
                    acc[cur.size][location] = (acc[cur.size][location] || 0) + cur.quantity;
                }
                return acc;
            }, {});

            const formData = new FormData();
            formData.append("name", editForm.name);
            formData.append("price", editForm.price);
            formData.append("sizes", JSON.stringify(sizesObj));
            if (editForm.category) formData.append("category", editForm.category);
            // Always send category_ids, even if empty (to clear categories if needed)
            const categoryIdsToSend = editForm.category_ids || [];
            console.log("Saving category_ids:", categoryIdsToSend);
            formData.append("category_ids", categoryIdsToSend.join(','));
            if (editForm.color) formData.append("color", editForm.color);
            if (editForm.gsm) formData.append("gsm", editForm.gsm);
            if (editForm.age_group) formData.append("age_group", editForm.age_group);
            if (editForm.description) formData.append("description", editForm.description);
            if (editForm.discount_percent && editForm.discount_percent !== "") {
                formData.append("discount_percent", editForm.discount_percent);
            } else if (editForm.sale_price && editForm.sale_price !== "") {
                formData.append("sale_price", editForm.sale_price);
            }
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
            sizes: [...prev.sizes, { size: "", quantity: 0, location: 'online' }],
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
        setSizes([...sizes, { size: '', quantity: 0, location: 'online' }]);
    };

    const handleMoveInventory = async (productId, size, quantity, fromLocation, toLocation) => {
        try {
            const formData = new FormData();
            formData.append("size", size);
            formData.append("quantity", quantity);
            formData.append("from_location", fromLocation);
            formData.append("to_location", toLocation);

            await axios.post(`${API_URL}/products/${productId}/move-inventory`, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setMoveInventory(null);
            await fetchProducts();
        } catch (error) {
            console.error("Failed to move inventory", error);
            alert(error.response?.data?.detail || "Kunde inte flytta lager");
        }
    };

    // Check if token is missing or expired
    if (!token || !isTokenValid(token)) {
        return (
            <div className="p-4">
                <h2 className="text-lg font-semibold mb-2">Admin Login</h2>
                <div className="space-y-3">
                    <input
                        type="password"
                        placeholder="Lösenord"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                login(password, rememberMe);
                            }
                        }}
                        className="border p-2 rounded w-full max-w-xs"
                    />
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="border"
                        />
                        <label htmlFor="rememberMe" className="text-sm text-gray-700">
                            Kom ihåg mig (30 dagar)
                        </label>
                    </div>
                    <button
                        onClick={() => login(password, rememberMe)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                    >
                        Logga in
                    </button>
                    {token && isTokenExpired(token) && (
                        <p className="text-sm text-red-600 mt-2">
                            Din session har gått ut. Vänligen logga in igen.
                        </p>
                    )}
                </div>
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
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Befintliga kategorier</h4>
                        {categories.length > 1 && (
                            <button
                                onClick={saveCategoryOrder}
                                disabled={isReorderingCategories}
                                className={`px-3 py-1 text-sm rounded ${isReorderingCategories ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white`}
                            >
                                {isReorderingCategories ? 'Sparar...' : 'Spara ordning'}
                            </button>
                        )}
                    </div>
                    {categories.length === 0 ? (
                        <p className="text-gray-500 text-sm">Inga kategorier ännu</p>
                    ) : (
                        <div className="space-y-2">
                            {categories.map((cat, index) => (
                                <div key={cat.id} className="border p-3 rounded flex items-start gap-3">
                                    {/* Order controls */}
                                    <div className="flex flex-col gap-1 pt-1">
                                        <button
                                            onClick={() => moveCategory(index, 'up')}
                                            disabled={index === 0}
                                            className={`px-2 py-1 text-xs rounded ${index === 0 ? 'bg-gray-200 cursor-not-allowed text-gray-400' : 'bg-gray-300 hover:bg-gray-400'} text-gray-700`}
                                            title="Flytta upp"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            onClick={() => moveCategory(index, 'down')}
                                            disabled={index === categories.length - 1}
                                            className={`px-2 py-1 text-xs rounded ${index === categories.length - 1 ? 'bg-gray-200 cursor-not-allowed text-gray-400' : 'bg-gray-300 hover:bg-gray-400'} text-gray-700`}
                                            title="Flytta ner"
                                        >
                                            ↓
                                        </button>
                                    </div>
                                    <div className="flex-1">
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
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Add New Product Button */}
            <div className="mb-6">
                <button
                    onClick={() => setShowCreateProductModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold"
                >
                    + Lägg till ny produkt
                </button>
            </div>

            {/* Add New Product Modal */}
            {showCreateProductModal && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowCreateProductModal(false);
                            // Reset form when closing
                            setName("");
                            setPrice("");
                            setSizes([{ size: '', quantity: 0, location: 'online' }]);
                            setImageFiles([]);
                            setCategory("");
                            setColor("");
                            setGsm("");
                            setAgeGroup("");
                            setDescription("");
                            setSalePrice("");
                            setDiscountPercent("");
                            setSaleType("percent");
                            setSelectedCategoryIds([]);
                            setCreateSuccess(false);
                        }
                    }}
                >
                    <div 
                        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                            <h3 className="text-xl font-semibold">Lägg till ny produkt</h3>
                            <button
                                onClick={() => {
                                    setShowCreateProductModal(false);
                                    // Reset form when closing
                                    setName("");
                                    setPrice("");
                                    setSizes([{ size: '', quantity: 0, location: 'online' }]);
                                    setImageFiles([]);
                                    setCategory("");
                                    setColor("");
                                    setGsm("");
                                    setAgeGroup("");
                                    setDescription("");
                                    setSalePrice("");
                                    setDiscountPercent("");
                                    setSaleType("percent");
                                    setSelectedCategoryIds([]);
                                    setCreateSuccess(false);
                                }}
                                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Namn</label>
                            <input
                                type="text"
                                placeholder="Namn"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="border p-1 mr-2 w-full mb-2"
                            />

                            <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">Pris</label>
                            <input
                                type="number"
                                placeholder="Pris"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="border p-1 mr-2 w-full mb-2"
                            />

                            <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rabatt / Reapris</label>
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={saleType}
                            onChange={(e) => {
                                setSaleType(e.target.value);
                                setSalePrice("");
                                setDiscountPercent("");
                            }}
                            className="border p-1 rounded"
                        >
                            <option value="percent">Rabatt %</option>
                            <option value="price">Reapris</option>
                        </select>
                        {saleType === "percent" ? (
                            <>
                                <input
                                    type="number"
                                    placeholder="50 för 50%"
                                    value={discountPercent}
                                    onChange={(e) => setDiscountPercent(e.target.value)}
                                    className="border p-1 w-32"
                                    min="0"
                                    max="100"
                                />
                                <span className="text-sm text-gray-500">%</span>
                                {discountPercent && price && (
                                    <span className="text-sm text-gray-600">
                                        = {Math.round(price * (1 - discountPercent / 100))} kr
                                    </span>
                                )}
                            </>
                        ) : (
                            <input
                                type="number"
                                placeholder="Reapris"
                                value={salePrice}
                                onChange={(e) => setSalePrice(e.target.value)}
                                className="border p-1 w-32"
                            />
                        )}
                            </div>
                            </div>

                            <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">Kategorier (välj en eller flera)</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                    {categories.map((cat) => (
                        <label key={cat.id} className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={selectedCategoryIds.includes(cat.id)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedCategoryIds(prev => [...prev, cat.id]);
                                    } else {
                                        setSelectedCategoryIds(prev => prev.filter(id => id !== cat.id));
                                    }
                                }}
                                className="border p-1"
                            />
                            <span>{cat.name}</span>
                        </label>
                            ))}
                            </div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">Eller ange kategori manuellt (för bakåtkompatibilitet)</label>
                            <input
                                type="text"
                                placeholder="Kategori"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="border p-1 mr-2 w-full mb-2"
                            />

                            <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">Färg (t.ex. "blue", "white")</label>
                            <input
                                type="text"
                                placeholder="Färg"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="border p-1 mr-2 w-full mb-2"
                            />

                            <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">GSM (t.ex. "550", "750")</label>
                            <input
                                type="text"
                                placeholder="GSM"
                                value={gsm}
                                onChange={(e) => setGsm(e.target.value)}
                                className="border p-1 mr-2 w-full mb-2"
                            />

                            <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">Åldersgrupp (t.ex. "children", "adult")</label>
                            <input
                                type="text"
                                placeholder="Åldersgrupp"
                                value={ageGroup}
                                onChange={(e) => setAgeGroup(e.target.value)}
                                className="border p-1 mr-2 w-full mb-2"
                            />

                            <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">Beskrivning (för SEO - skriv på svenska)</label>
                            <textarea
                                placeholder="Beskriv produktens egenskaper, vem den passar för, vilka tävlingar/klubbar den är lämplig för, tygtjocklek, storleksguide, tvättråd, etc."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="border p-2 w-full mb-2"
                                rows="6"
                            />

                            <div className="space-y-2 mt-2">
                    <p className="text-xs text-gray-500 mb-1">
                        Du kan lägga till samma storlek flera gånger med olika platser (t.ex. 160cm hemma och 160cm i klubben)
                    </p>
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
                            <select
                                value={entry.location || 'online'}
                                onChange={(e) => updateSize(index, 'location', e.target.value)}
                                className="border p-2 rounded w-32"
                            >
                                <option value="online">Online (Hemma)</option>
                                <option value="club">Showroom (Klubben)</option>
                            </select>
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
                                className={`px-4 py-2 mt-4 ${isCreating ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white rounded font-semibold`}
                            >
                                {isCreating ? 'Laddar...' : 'Skapa produkt'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rabatt / Reapris</label>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <select
                                            value={editForm.sale_type || "percent"}
                                            onChange={(e) => {
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    sale_type: e.target.value,
                                                    sale_price: "",
                                                    discount_percent: ""
                                                }));
                                            }}
                                            className="border p-1 rounded"
                                        >
                                            <option value="percent">Rabatt %</option>
                                            <option value="price">Reapris</option>
                                        </select>
                                        {editForm.sale_type === "percent" ? (
                                            <>
                                                <input
                                                    name="discount_percent"
                                                    type="number"
                                                    value={editForm.discount_percent}
                                                    onChange={(e) => setEditForm((prev) => ({ ...prev, discount_percent: e.target.value }))}
                                                    className="border p-1 w-32"
                                                    placeholder="50 för 50%"
                                                    min="0"
                                                    max="100"
                                                />
                                                <span className="text-sm text-gray-500">%</span>
                                                {editForm.discount_percent && editForm.price && (
                                                    <span className="text-sm text-gray-600">
                                                        = {Math.round(editForm.price * (1 - editForm.discount_percent / 100))} kr
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <input
                                                name="sale_price"
                                                type="number"
                                                value={editForm.sale_price}
                                                onChange={(e) => setEditForm((prev) => ({ ...prev, sale_price: e.target.value }))}
                                                className="border p-1 w-32"
                                                placeholder="Reapris"
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategorier (välj en eller flera)</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {categories.map((cat) => (
                                            <label key={cat.id} className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={editForm.category_ids && editForm.category_ids.includes(cat.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setEditForm((prev) => ({
                                                                ...prev,
                                                                category_ids: [...(prev.category_ids || []), cat.id]
                                                            }));
                                                        } else {
                                                            setEditForm((prev) => ({
                                                                ...prev,
                                                                category_ids: (prev.category_ids || []).filter(id => id !== cat.id)
                                                            }));
                                                        }
                                                    }}
                                                    className="border p-1"
                                                />
                                                <span>{cat.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Eller ange kategori manuellt (för bakåtkompatibilitet)</label>
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
                                <div className="mt-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivning (för SEO - skriv på svenska)</label>
                                    <textarea
                                        name="description"
                                        value={editForm.description}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                                        className="border p-2 w-full"
                                        placeholder="Beskriv produktens egenskaper, vem den passar för, vilka tävlingar/klubbar den är lämplig för, tygtjocklek, storleksguide, tvättråd, etc."
                                        rows="6"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mb-1">
                                    Du kan lägga till samma storlek flera gånger med olika platser (t.ex. 160cm hemma och 160cm i klubben)
                                </p>
                                {editForm.sizes.map((entry, index) => (
                                    <div key={index} className="flex gap-2 items-center mt-1">
                                        <input
                                            type="text"
                                            value={entry.size}
                                            onChange={(e) => updateEditSize(index, 'size', e.target.value)}
                                            className="border p-1 w-20"
                                            placeholder="Storlek"
                                        />
                                        <input
                                            type="number"
                                            value={entry.quantity}
                                            onChange={(e) => updateEditSize(index, 'quantity', e.target.value)}
                                            className="border p-1 w-20"
                                            placeholder="Antal"
                                        />
                                        <select
                                            value={entry.location || 'online'}
                                            onChange={(e) => updateEditSize(index, 'location', e.target.value)}
                                            className="border p-1 w-32"
                                        >
                                            <option value="online">Online (Hemma)</option>
                                            <option value="club">Showroom (Klubben)</option>
                                        </select>
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
                                                    <div key={`${product.id}-${img}`} className="relative group">
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
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteImage(product.id, img);
                                                            }}
                                                            className="absolute top-0 left-0 bg-red-600 text-white text-xs w-6 h-6 rounded-full hover:bg-red-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Ta bort bild"
                                                        >
                                                            ×
                                                        </button>
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
                                <div className="text-sm text-gray-600">
                                    <p className="font-semibold mb-1">Lager:</p>
                                    {Object.entries(product.sizes || {}).map(([size, value]) => {
                                        // Handle new location-based format: {"online": 2, "club": 1}
                                        if (typeof value === 'object' && value !== null && ("online" in value || "club" in value)) {
                                            const onlineQty = value.online || 0;
                                            const clubQty = value.club || 0;
                                            const total = onlineQty + clubQty;
                                            
                                            if (total === 0) return null;
                                            
                                            return (
                                                <div key={size} className="ml-2 mb-2 flex items-center gap-2 flex-wrap">
                                                    <span>
                                                        {size}: {total} st total
                                                        {onlineQty > 0 && <span className="text-blue-600"> ({onlineQty} hemma)</span>}
                                                        {clubQty > 0 && <span className="text-green-600"> ({clubQty} klubben)</span>}
                                                    </span>
                                                    {onlineQty > 0 && (
                                                        <button
                                                            onClick={() => setMoveInventory({
                                                                productId: product.id,
                                                                productName: product.name,
                                                                size,
                                                                fromLocation: 'online',
                                                                toLocation: 'club',
                                                                maxQty: onlineQty
                                                            })}
                                                            className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-0.5 rounded"
                                                            title="Flytta från hemma till klubben"
                                                        >
                                                            → Klubb
                                                        </button>
                                                    )}
                                                    {clubQty > 0 && (
                                                        <button
                                                            onClick={() => setMoveInventory({
                                                                productId: product.id,
                                                                productName: product.name,
                                                                size,
                                                                fromLocation: 'club',
                                                                toLocation: 'online',
                                                                maxQty: clubQty
                                                            })}
                                                            className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-0.5 rounded"
                                                            title="Flytta från klubben till hemma"
                                                        >
                                                            → Hemma
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        }
                                        // Handle old intermediate format or old number format
                                        else {
                                            const quantity = typeof value === 'object' && value.quantity !== undefined ? value.quantity : value;
                                            const location = typeof value === 'object' ? (value.location || 'online') : 'online';
                                            const locationLabel = location === 'club' ? 'Showroom (Klubben)' : 'Online (Hemma)';
                                            return (
                                                <p key={size} className="ml-2">
                                                    {size}: {quantity} st - {locationLabel}
                                                </p>
                                            );
                                        }
                                    })}
                                </div>
                                <button onClick={() => startEdit(product)} className="bg-yellow-500 text-white px-2 py-1 mr-1">Redigera</button>
                                <button onClick={() => deleteProduct(product.id)} className="bg-red-600 text-white px-2 py-1">Ta bort</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Move Inventory Modal */}
            {moveInventory && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={() => setMoveInventory(null)}
                >
                    <div 
                        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-semibold mb-4">Flytta lager</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            {moveInventory.productName} - Storlek {moveInventory.size}
                        </p>
                        <p className="text-sm mb-4">
                            Flytta från <span className="font-semibold">{moveInventory.fromLocation === 'online' ? 'Hemma' : 'Klubben'}</span> till <span className="font-semibold">{moveInventory.toLocation === 'online' ? 'Hemma' : 'Klubben'}</span>
                        </p>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Antal att flytta (max {moveInventory.maxQty})
                            </label>
                            <input
                                type="number"
                                min="1"
                                max={moveInventory.maxQty}
                                defaultValue="1"
                                id="moveQtyInput"
                                className="border p-2 rounded w-full"
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setMoveInventory(null)}
                                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                            >
                                Avbryt
                            </button>
                            <button
                                onClick={() => {
                                    const qty = parseInt(document.getElementById('moveQtyInput').value) || 1;
                                    if (qty > 0 && qty <= moveInventory.maxQty) {
                                        handleMoveInventory(
                                            moveInventory.productId,
                                            moveInventory.size,
                                            qty,
                                            moveInventory.fromLocation,
                                            moveInventory.toLocation
                                        );
                                    } else {
                                        alert(`Ange ett antal mellan 1 och ${moveInventory.maxQty}`);
                                    }
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Flytta
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default AdminPage;
