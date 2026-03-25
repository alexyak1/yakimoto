import React, { useState } from "react";
import axios from "axios";
import { SmartImage } from "../SmartImage";
import { NEW_PRODUCT_LABEL, SALE_LABEL } from "../../constants";

const API_URL = import.meta.env.VITE_API_URL;

function ProductForm({ form, setForm, categories, sizes, setSizes, imageFiles, setImageFiles, onSubmit, isSubmitting, submitLabel, submitLoadingLabel, successMessage }) {
    const updateSize = (index, field, value) => {
        const updated = [...sizes];
        updated[index] = { ...updated[index], [field]: field === "quantity" ? parseInt(value) : value };
        setSizes(updated);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Namn</label>
                    <input type="text" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Produktnamn" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pris (SEK)</label>
                    <input type="number" value={form.price} onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="0" />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inköpspris (SEK)</label>
                <input type="number" value={form.cost} onChange={(e) => setForm(prev => ({ ...prev, profit: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="0" />
            </div>

            {/* Discount */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rabatt / Reapris</label>
                <div className="flex items-center gap-3">
                    <select value={form.sale_type || "percent"} onChange={(e) => setForm(prev => ({ ...prev, sale_type: e.target.value, sale_price: "", discount_percent: "" }))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <option value="percent">Rabatt %</option>
                        <option value="price">Reapris</option>
                    </select>
                    {(form.sale_type || "percent") === "percent" ? (
                        <div className="flex items-center gap-2">
                            <input type="number" value={form.discount_percent} onChange={(e) => setForm(prev => ({ ...prev, discount_percent: e.target.value }))} className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="50" min="0" max="100" />
                            <span className="text-sm text-gray-500">%</span>
                            {form.discount_percent && form.price && (
                                <span className="text-sm text-gray-500">= {Math.round(form.price * (1 - form.discount_percent / 100))} kr</span>
                            )}
                        </div>
                    ) : (
                        <input type="number" value={form.sale_price} onChange={(e) => setForm(prev => ({ ...prev, sale_price: e.target.value }))} className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Reapris" />
                    )}
                </div>
            </div>

            {/* Categories */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kategorier</label>
                <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                        <label key={cat.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${form.category_ids?.includes(cat.id) ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                            <input type="checkbox" checked={form.category_ids?.includes(cat.id) || false} onChange={(e) => {
                                if (e.target.checked) {
                                    setForm(prev => ({ ...prev, category_ids: [...(prev.category_ids || []), cat.id] }));
                                } else {
                                    setForm(prev => ({ ...prev, category_ids: (prev.category_ids || []).filter(id => id !== cat.id) }));
                                }
                            }} className="sr-only" />
                            {cat.name}
                        </label>
                    ))}
                </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Färg</label>
                    <input type="text" value={form.color} onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="t.ex. blue" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GSM</label>
                    <input type="text" value={form.gsm} onChange={(e) => setForm(prev => ({ ...prev, gsm: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="t.ex. 550" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Åldersgrupp</label>
                    <input type="text" value={form.age_group} onChange={(e) => setForm(prev => ({ ...prev, age_group: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="t.ex. children" />
                </div>
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivning</label>
                <textarea value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows="4" placeholder="Beskriv produkten..." />
            </div>

            {/* New Badge */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_new || false} onChange={(e) => setForm(prev => ({ ...prev, is_new: e.target.checked }))} className="w-4 h-4 text-green-600 rounded" />
                    <span className="font-medium text-green-800 text-sm">Markera som ny produkt</span>
                    <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">{NEW_PRODUCT_LABEL}</span>
                </label>
                {form.is_new && (
                    <div className="mt-3">
                        <select value={form.new_duration || ""} onChange={(e) => setForm(prev => ({ ...prev, new_duration: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                            <option value="">Ingen tidsgräns</option>
                            <option value="1week">1 vecka</option>
                            <option value="2weeks">2 veckor</option>
                            <option value="1month">1 månad</option>
                            <option value="3months">3 månader</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Sizes */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Storlekar & Lager</label>
                <div className="space-y-2">
                    {sizes.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <input type="text" placeholder="Storlek" value={entry.size} onChange={(e) => updateSize(index, "size", e.target.value)} className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                            <input type="number" placeholder="Antal" value={entry.quantity} min={0} onChange={(e) => updateSize(index, "quantity", e.target.value)} className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                            <select value={entry.location || "online"} onChange={(e) => updateSize(index, "location", e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                                <option value="online">Online</option>
                                <option value="club">Showroom</option>
                            </select>
                            <button type="button" onClick={() => { const u = [...sizes]; u.splice(index, 1); setSizes(u); }} className="text-red-500 hover:text-red-700 p-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    ))}
                    <button type="button" onClick={() => setSizes(prev => [...prev, { size: "", quantity: 0, location: "online" }])} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        + Lägg till storlek
                    </button>
                </div>
            </div>

            {/* Images */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bilder</label>
                <input type="file" multiple onChange={(e) => { setImageFiles(Array.from(e.target.files)); }} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" disabled={isSubmitting} />
                {imageFiles.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1">{imageFiles.length} bild(er) valda</p>
                )}
            </div>

            {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-sm">
                    {successMessage}
                </div>
            )}

            <button onClick={onSubmit} disabled={isSubmitting} className={`w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
                {isSubmitting ? submitLoadingLabel : submitLabel}
            </button>
        </div>
    );
}

export default function AdminProducts({ products, categories, token, fetchProducts, searchQuery }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editProductId, setEditProductId] = useState(null);
    const [editProduct, setEditProduct] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [createSuccess, setCreateSuccess] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [moveInventory, setMoveInventory] = useState(null);

    // Create form state
    const [createForm, setCreateForm] = useState({
        name: "", price: "", cost: "", color: "", gsm: "", age_group: "", description: "",
        sale_price: "", discount_percent: "", sale_type: "percent",
        category_ids: [], is_new: false, new_duration: "", category: "",
    });
    const [createSizes, setCreateSizes] = useState([{ size: "", quantity: 0, location: "online" }]);
    const [createImages, setCreateImages] = useState([]);

    // Edit form state
    const [editForm, setEditForm] = useState({
        name: "", price: "", cost: "", color: "", gsm: "", age_group: "", description: "",
        sale_price: "", discount_percent: "", sale_type: "percent",
        category_ids: [], is_new: false, new_duration: "", new_until: "", category: "",
    });
    const [editSizes, setEditSizes] = useState([]);
    const [editImages, setEditImages] = useState([]);

    const calculateNewUntilDate = (duration) => {
        if (!duration) return null;
        const now = new Date();
        switch (duration) {
            case "1week": now.setDate(now.getDate() + 7); break;
            case "2weeks": now.setDate(now.getDate() + 14); break;
            case "1month": now.setMonth(now.getMonth() + 1); break;
            case "3months": now.setMonth(now.getMonth() + 3); break;
            default: return null;
        }
        return now.toISOString();
    };

    const buildFormData = (form, sizes, images) => {
        const formData = new FormData();
        formData.append("name", form.name);
        formData.append("price", form.price);
        if (form.cost) formData.append("cost", form.cost);
        const sizesObj = sizes.reduce((acc, cur) => {
            if (cur.size.trim()) {
                if (!acc[cur.size]) acc[cur.size] = { online: 0, club: 0 };
                const loc = cur.location || "online";
                acc[cur.size][loc] = (acc[cur.size][loc] || 0) + cur.quantity;
            }
            return acc;
        }, {});
        formData.append("sizes", JSON.stringify(sizesObj));
        if (form.category) formData.append("category", form.category);
        formData.append("category_ids", (form.category_ids || []).join(","));
        if (form.color) formData.append("color", form.color);
        if (form.gsm) formData.append("gsm", form.gsm);
        if (form.age_group) formData.append("age_group", form.age_group);
        if (form.description) formData.append("description", form.description);
        if (form.discount_percent && form.discount_percent !== "" && form.discount_percent !== "0") {
            formData.append("discount_percent", form.discount_percent);
        } else if (form.sale_price && form.sale_price !== "" && form.sale_price !== "0") {
            formData.append("sale_price", form.sale_price);
        }
        formData.append("is_new", form.is_new ? "true" : "false");
        if (form.is_new && form.new_duration) {
            const d = calculateNewUntilDate(form.new_duration);
            if (d) formData.append("new_until", d);
        }
        for (let file of images) formData.append("images", file);
        return formData;
    };

    const handleCreate = async () => {
        setIsCreating(true);
        setCreateSuccess(false);
        try {
            await axios.post(`${API_URL}/products`, buildFormData(createForm, createSizes, createImages), {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCreateSuccess(true);
            setCreateForm({ name: "", price: "", color: "", gsm: "", age_group: "", description: "", sale_price: "", discount_percent: "", sale_type: "percent", category_ids: [], is_new: false, new_duration: "", category: "" });
            setCreateSizes([{ size: "", quantity: 0, location: "online" }]);
            setCreateImages([]);
            await fetchProducts();
            setTimeout(() => { setCreateSuccess(false); setShowCreateModal(false); }, 1500);
        } catch (error) {
            alert("Kunde inte skapa produkt");
        } finally {
            setIsCreating(false);
        }
    };

    const startEdit = (product) => {
        setEditProductId(product.id);
        setEditProduct(product);
        const parsedSizes = [];
        Object.entries(product.sizes || {}).forEach(([size, value]) => {
            if (typeof value === "object" && value !== null) {
                if ("online" in value || "club" in value) {
                    if (value.online > 0) parsedSizes.push({ size, quantity: value.online, location: "online" });
                    if (value.club > 0) parsedSizes.push({ size, quantity: value.club, location: "club" });
                } else if ("quantity" in value) {
                    parsedSizes.push({ size, quantity: value.quantity || 0, location: value.location || "online" });
                }
            } else {
                parsedSizes.push({ size, quantity: value || 0, location: "online" });
            }
        });
        const categoryIds = product.categories ? product.categories.map(c => c.id) : [];
        const isNewActive = product.is_new && (!product.new_until || new Date(product.new_until) > new Date());
        let remainingDuration = "";
        if (product.new_until) {
            const days = Math.ceil((new Date(product.new_until) - new Date()) / (1000 * 60 * 60 * 24));
            if (days > 0) {
                if (days <= 7) remainingDuration = "1week";
                else if (days <= 14) remainingDuration = "2weeks";
                else if (days <= 30) remainingDuration = "1month";
                else remainingDuration = "3months";
            }
        }
        setEditForm({
            name: product.name, price: product.price, cost: product.cost || "",
            color: product.color || "", gsm: product.gsm || "", age_group: product.age_group || "",
            description: product.description || "", sale_price: product.sale_price || "",
            discount_percent: product.discount_percent || "",
            sale_type: product.discount_percent ? "percent" : "price",
            category_ids: categoryIds, is_new: isNewActive,
            new_duration: remainingDuration, new_until: product.new_until || "",
            category: product.category || "",
        });
        setEditSizes(parsedSizes.length > 0 ? parsedSizes : [{ size: "", quantity: 0, location: "online" }]);
        setEditImages([]);
    };

    const submitEdit = async (id) => {
        setIsUploading(true);
        setUploadSuccess(false);
        try {
            await axios.put(`${API_URL}/products/${id}`, buildFormData(editForm, editSizes, editImages), {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUploadSuccess(true);
            setEditImages([]);
            await fetchProducts();
            // Refresh editProduct with latest data
            try {
                const res = await axios.get(`${API_URL}/products/${id}`);
                const updated = { ...res.data, sizes: JSON.parse(res.data.sizes || "{}") };
                setEditProduct(updated);
            } catch {}
            setTimeout(() => setUploadSuccess(false), 3000);
        } catch (error) {
            alert("Kunde inte spara produkt");
        } finally {
            setIsUploading(false);
        }
    };

    const deleteProduct = async (id) => {
        if (!confirm("Är du säker på att du vill ta bort denna produkt?")) return;
        await axios.delete(`${API_URL}/products/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        fetchProducts();
    };

    const handleSetMainImage = async (productId, filename) => {
        try {
            const formData = new FormData();
            formData.append("filename", filename);
            await axios.post(`${API_URL}/products/${productId}/set-main-image`, formData, { headers: { Authorization: `Bearer ${token}` } });
            await fetchProducts();
        } catch {
            alert("Kunde inte uppdatera huvudbild");
        }
    };

    const handleDeleteImage = async (productId, filename) => {
        if (!confirm("Är du säker på att du vill ta bort denna bild?")) return;
        try {
            await axios.delete(`${API_URL}/products/${productId}/images/${encodeURIComponent(filename)}`, { headers: { Authorization: `Bearer ${token}` } });
            await fetchProducts();
        } catch {
            alert("Kunde inte ta bort bild");
        }
    };

    const handleMoveInventory = async (productId, size, quantity, fromLocation, toLocation) => {
        try {
            const formData = new FormData();
            formData.append("size", size);
            formData.append("quantity", quantity);
            formData.append("from_location", fromLocation);
            formData.append("to_location", toLocation);
            await axios.post(`${API_URL}/products/${productId}/move-inventory`, formData, { headers: { Authorization: `Bearer ${token}` } });
            setMoveInventory(null);
            await fetchProducts();
        } catch (error) {
            alert(error.response?.data?.detail || "Kunde inte flytta lager");
        }
    };

    const getProductStock = (product) => {
        return Object.values(product.sizes || {}).reduce((s, v) => {
            if (typeof v === "object" && v !== null) return s + (v.online || 0) + (v.club || 0);
            return s + (typeof v === "number" ? v : 0);
        }, 0);
    };

    const filtered = searchQuery
        ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : products;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{filtered.length} produkter</p>
                <button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Ny produkt
                </button>
            </div>

            {/* Product List */}
            <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
                {filtered.map((product) => (
                    <div key={product.id} className="p-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                                {product.main_image || (product.images && product.images[0]) ? (
                                    <SmartImage src={product.main_image || product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">Bild</div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                                    {!!product.is_new && <span className="bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">{NEW_PRODUCT_LABEL}</span>}
                                    {product.sale_price && <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">{SALE_LABEL}</span>}
                                </div>
                                <p className="text-sm text-gray-500">{product.price} SEK</p>
                                {/* Stock details */}
                                <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-x-3">
                                    {Object.entries(product.sizes || {}).map(([size, value]) => {
                                        if (typeof value === "object" && ("online" in value || "club" in value)) {
                                            const total = (value.online || 0) + (value.club || 0);
                                            if (total === 0) return null;
                                            return (
                                                <span key={size} className="flex items-center gap-1">
                                                    {size}: {total}st
                                                    {(value.online || 0) > 0 && (
                                                        <button onClick={() => setMoveInventory({ productId: product.id, productName: product.name, size, fromLocation: "online", toLocation: "club", maxQty: value.online })} className="text-green-600 hover:underline">({value.online}h)</button>
                                                    )}
                                                    {(value.club || 0) > 0 && (
                                                        <button onClick={() => setMoveInventory({ productId: product.id, productName: product.name, size, fromLocation: "club", toLocation: "online", maxQty: value.club })} className="text-blue-600 hover:underline">({value.club}k)</button>
                                                    )}
                                                </span>
                                            );
                                        }
                                        return <span key={size}>{size}: {typeof value === "object" ? value.quantity : value}st</span>;
                                    })}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="text-sm text-gray-500">{getProductStock(product)} i lager</span>
                                <button onClick={() => startEdit(product)} className="text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={() => deleteProduct(product.id)} className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="p-8 text-center text-gray-500 text-sm">Inga produkter hittades</div>
                )}
            </div>

            {/* Create Product Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center rounded-t-2xl">
                            <h3 className="text-lg font-semibold">Ny produkt</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <ProductForm
                                form={createForm} setForm={setCreateForm}
                                categories={categories}
                                sizes={createSizes} setSizes={setCreateSizes}
                                imageFiles={createImages} setImageFiles={setCreateImages}
                                onSubmit={handleCreate}
                                isSubmitting={isCreating}
                                submitLabel="Skapa produkt"
                                submitLoadingLabel="Skapar..."
                                successMessage={createSuccess ? "Produkt skapad!" : null}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Product Modal */}
            {editProductId && editProduct && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) { setEditProductId(null); setEditProduct(null); setEditImages([]); setUploadSuccess(false); } }}>
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center rounded-t-2xl z-10">
                            <h3 className="text-lg font-semibold">Redigera: {editProduct.name}</h3>
                            <button onClick={() => { setEditProductId(null); setEditProduct(null); setEditImages([]); setUploadSuccess(false); }} className="text-gray-400 hover:text-gray-600 p-1">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Current Images */}
                            {editProduct.images && editProduct.images.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Bilder (klicka för att välja huvudbild)</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {editProduct.images.map((img, idx) => {
                                            const isMain = editProduct.main_image === img || (idx === 0 && !editProduct.main_image);
                                            return (
                                                <div key={`${editProduct.id}-${img}`} className="relative group">
                                                    <SmartImage src={img} alt="Produktbild" onClick={async () => { await handleSetMainImage(editProduct.id, img); setEditProduct(prev => ({ ...prev, main_image: img })); }} className={`w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition border-2 ${isMain ? "border-blue-500" : "border-gray-200"}`} />
                                                    {isMain && <div className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">Huvud</div>}
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteImage(editProduct.id, img).then(() => setEditProduct(prev => ({ ...prev, images: prev.images.filter(i => i !== img) }))); }} className="absolute -top-1 -left-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600">x</button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <ProductForm
                                form={editForm} setForm={setEditForm}
                                categories={categories}
                                sizes={editSizes} setSizes={setEditSizes}
                                imageFiles={editImages} setImageFiles={setEditImages}
                                onSubmit={async () => { await submitEdit(editProduct.id); }}
                                isSubmitting={isUploading}
                                submitLabel="Spara ändringar"
                                submitLoadingLabel="Sparar..."
                                successMessage={uploadSuccess ? "Sparad!" : null}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Move Inventory Modal */}
            {moveInventory && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setMoveInventory(null)}>
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-2">Flytta lager</h3>
                        <p className="text-sm text-gray-600 mb-1">{moveInventory.productName} - Storlek {moveInventory.size}</p>
                        <p className="text-sm text-gray-500 mb-4">
                            {moveInventory.fromLocation === "online" ? "Hemma" : "Klubben"} → {moveInventory.toLocation === "online" ? "Hemma" : "Klubben"}
                        </p>
                        <input type="number" min="1" max={moveInventory.maxQty} defaultValue="1" id="moveQtyInput" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4" />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setMoveInventory(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Avbryt</button>
                            <button onClick={() => {
                                const qty = parseInt(document.getElementById("moveQtyInput").value) || 1;
                                if (qty > 0 && qty <= moveInventory.maxQty) {
                                    handleMoveInventory(moveInventory.productId, moveInventory.size, qty, moveInventory.fromLocation, moveInventory.toLocation);
                                }
                            }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Flytta</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
