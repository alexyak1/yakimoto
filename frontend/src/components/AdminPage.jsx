import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { updatePageMeta } from "../seo.jsx";
import { isTokenValid, isTokenExpired } from "../utils/auth";

import AdminLayout from "./admin/AdminLayout";
import AdminLogin from "./admin/AdminLogin";
import AdminDashboard from "./admin/AdminDashboard";
import AdminProducts from "./admin/AdminProducts";
import AdminCategories from "./admin/AdminCategories";
import AdminImageTools from "./admin/AdminImageTools";
import AdminSettings from "./admin/AdminSettings";
import AdminOrders from "./admin/AdminOrders";

const API_URL = import.meta.env.VITE_API_URL;

function AdminPage({ token, login, logout }) {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (token && isTokenExpired(token)) return;
        fetchProducts();
        fetchCategories();
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
                sizes: JSON.parse(p.sizes || "{}"),
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

    if (!token || !isTokenValid(token)) {
        return <AdminLogin token={token} login={login} />;
    }

    return (
        <AdminLayout products={products} searchQuery={searchQuery} setSearchQuery={setSearchQuery}>
            <Routes>
                <Route index element={<AdminDashboard products={products} categories={categories} />} />
                <Route path="orders" element={<AdminOrders products={products} token={token} searchQuery={searchQuery} />} />
                <Route path="products" element={<AdminProducts products={products} categories={categories} token={token} fetchProducts={fetchProducts} searchQuery={searchQuery} />} />
                <Route path="categories" element={<AdminCategories categories={categories} token={token} fetchCategories={fetchCategories} />} />
                <Route path="image-tools" element={<AdminImageTools token={token} />} />
                <Route path="settings" element={<AdminSettings logout={logout} />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
        </AdminLayout>
    );
}

export default AdminPage;
