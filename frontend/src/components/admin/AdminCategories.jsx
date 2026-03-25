import React, { useState } from "react";
import axios from "axios";
import { SmartImage } from "../SmartImage";

const API_URL = import.meta.env.VITE_API_URL;

export default function AdminCategories({ categories, token, fetchCategories }) {
    const [categoryName, setCategoryName] = useState("");
    const [categoryImage, setCategoryImage] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [editCategoryId, setEditCategoryId] = useState(null);
    const [editCategoryName, setEditCategoryName] = useState("");
    const [editCategoryImage, setEditCategoryImage] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isReordering, setIsReordering] = useState(false);
    const [localCategories, setLocalCategories] = useState(null);

    const displayCategories = localCategories || categories;

    const handleCreate = async () => {
        if (!categoryName.trim()) return alert("Kategori namn krävs");
        setIsCreating(true);
        try {
            const formData = new FormData();
            formData.append("name", categoryName);
            if (categoryImage) formData.append("image", categoryImage);
            await axios.post(`${API_URL}/categories`, formData, { headers: { Authorization: `Bearer ${token}` } });
            setCategoryName("");
            setCategoryImage(null);
            await fetchCategories();
        } catch {
            alert("Kunde inte skapa kategori");
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdate = async (categoryId) => {
        if (!editCategoryName.trim()) return alert("Kategori namn krävs");
        setIsUpdating(true);
        try {
            const formData = new FormData();
            formData.append("name", editCategoryName);
            if (editCategoryImage) formData.append("image", editCategoryImage);
            await axios.put(`${API_URL}/categories/${categoryId}`, formData, { headers: { Authorization: `Bearer ${token}` } });
            setEditCategoryId(null);
            setEditCategoryName("");
            setEditCategoryImage(null);
            await fetchCategories();
        } catch {
            alert("Kunde inte uppdatera kategori");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async (name) => {
        if (!confirm(`Ta bort kategorin "${name}"?`)) return;
        try {
            await axios.delete(`${API_URL}/categories/${encodeURIComponent(name)}`, { headers: { Authorization: `Bearer ${token}` } });
            await fetchCategories();
        } catch {
            alert("Kunde inte ta bort kategori");
        }
    };

    const moveCategory = (index, direction) => {
        if (direction === "up" && index === 0) return;
        if (direction === "down" && index === displayCategories.length - 1) return;
        const updated = [...displayCategories];
        const newIndex = direction === "up" ? index - 1 : index + 1;
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
        setLocalCategories(updated);
    };

    const saveCategoryOrder = async () => {
        setIsReordering(true);
        try {
            const categoryOrders = {};
            displayCategories.forEach((cat, index) => { categoryOrders[cat.id] = index; });
            await axios.post(`${API_URL}/categories/reorder`, categoryOrders, { headers: { Authorization: `Bearer ${token}` } });
            setLocalCategories(null);
            await fetchCategories();
        } catch {
            alert("Kunde inte spara kategoriordning");
            setLocalCategories(null);
            await fetchCategories();
        } finally {
            setIsReordering(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Create Category */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Ny kategori</h2>
                <div className="flex items-end gap-4 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Namn</label>
                        <input type="text" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="t.ex. Judo Gi" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bild</label>
                        <input type="file" accept="image/*" onChange={(e) => setCategoryImage(e.target.files[0] || null)} className="text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    </div>
                    <button onClick={handleCreate} disabled={isCreating} className={`px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors ${isCreating ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}>
                        {isCreating ? "Skapar..." : "Skapa"}
                    </button>
                </div>
            </div>

            {/* Category List */}
            <div className="bg-white rounded-xl border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Kategorier ({displayCategories.length})</h2>
                    {displayCategories.length > 1 && (
                        <button onClick={saveCategoryOrder} disabled={isReordering} className={`px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-colors ${isReordering ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}>
                            {isReordering ? "Sparar..." : "Spara ordning"}
                        </button>
                    )}
                </div>
                <div className="divide-y divide-gray-100">
                    {displayCategories.length === 0 ? (
                        <p className="p-6 text-gray-500 text-sm text-center">Inga kategorier ännu</p>
                    ) : (
                        displayCategories.map((cat, index) => (
                            <div key={cat.id} className="p-4 flex items-start gap-3">
                                {/* Reorder */}
                                <div className="flex flex-col gap-1 pt-1">
                                    <button onClick={() => moveCategory(index, "up")} disabled={index === 0} className={`p-1 rounded ${index === 0 ? "text-gray-300" : "text-gray-500 hover:bg-gray-100"}`}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                    </button>
                                    <button onClick={() => moveCategory(index, "down")} disabled={index === displayCategories.length - 1} className={`p-1 rounded ${index === displayCategories.length - 1 ? "text-gray-300" : "text-gray-500 hover:bg-gray-100"}`}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>
                                </div>

                                {editCategoryId === cat.id ? (
                                    <div className="flex-1 space-y-3">
                                        <input type="text" value={editCategoryName} onChange={(e) => setEditCategoryName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                                        <input type="file" accept="image/*" onChange={(e) => setEditCategoryImage(e.target.files[0] || null)} className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700" />
                                        {cat.image_filename && !editCategoryImage && (
                                            <SmartImage src={cat.image_filename} alt={cat.name} className="w-24 h-24 object-cover rounded-lg" />
                                        )}
                                        <div className="flex gap-2">
                                            <button onClick={() => handleUpdate(cat.id)} disabled={isUpdating} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">{isUpdating ? "Sparar..." : "Spara"}</button>
                                            <button onClick={() => { setEditCategoryId(null); setEditCategoryName(""); setEditCategoryImage(null); }} className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Avbryt</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center gap-4">
                                        {cat.image_filename && (
                                            <SmartImage src={cat.image_filename} alt={cat.name} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                                        )}
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">{cat.name}</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button onClick={() => { setEditCategoryId(cat.id); setEditCategoryName(cat.name); setEditCategoryImage(null); }} className="text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button onClick={() => handleDelete(cat.name)} className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
