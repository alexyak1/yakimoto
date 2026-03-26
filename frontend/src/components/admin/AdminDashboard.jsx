import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { SmartImage } from "../SmartImage";
import { NEW_PRODUCT_LABEL } from "../../constants";

const API_URL = import.meta.env.VITE_API_URL;

function StatCard({ icon, value, label, color, onClick }) {
    const colorMap = {
        blue: "bg-blue-50 text-blue-600",
        green: "bg-green-50 text-green-600",
        orange: "bg-orange-50 text-orange-500",
        purple: "bg-purple-50 text-purple-600",
    };

    return (
        <div
            onClick={onClick}
            className={`bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4 ${onClick ? "cursor-pointer hover:border-gray-300 transition-colors" : ""}`}
        >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.blue}`}>
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
            </div>
        </div>
    );
}

export default function AdminDashboard({ products, categories }) {
    const navigate = useNavigate();
    const [consentStats, setConsentStats] = useState({ accepted: 0, declined: 0 });
    const [showLowStock, setShowLowStock] = useState(false);

    useEffect(() => {
        axios.get(`${API_URL}/consent-stats`).then(res => setConsentStats(res.data)).catch(() => {});
    }, []);

    const totalStock = (products || []).reduce((sum, p) => {
        const sizes = p.sizes || {};
        return sum + Object.values(sizes).reduce((s, v) => {
            if (typeof v === "object" && v !== null) {
                return s + (v.online || 0) + (v.club || 0);
            }
            return s + (typeof v === "number" ? v : 0);
        }, 0);
    }, 0);

    const lowStockCount = (products || []).filter((p) => {
        const sizes = p.sizes || {};
        const stock = Object.values(sizes).reduce((s, v) => {
            if (typeof v === "object" && v !== null) {
                return s + (v.online || 0) + (v.club || 0);
            }
            return s + (typeof v === "number" ? v : 0);
        }, 0);
        return stock <= 3;
    }).length;

    const getProductStock = (product) => {
        const sizes = product.sizes || {};
        return Object.values(sizes).reduce((s, v) => {
            if (typeof v === "object" && v !== null) {
                return s + (v.online || 0) + (v.club || 0);
            }
            return s + (typeof v === "number" ? v : 0);
        }, 0);
    };

    const recentProducts = [...(products || [])].slice(0, 5);

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    color="blue"
                    value={products?.length || 0}
                    label="Produkter"
                    onClick={() => navigate("/admin/products")}
                    icon={
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    }
                />
                <StatCard
                    color="purple"
                    value={categories?.length || 0}
                    label="Kategorier"
                    onClick={() => navigate("/admin/categories")}
                    icon={
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                    }
                />
                <StatCard
                    color="green"
                    value={totalStock}
                    label="Totalt i lager"
                    onClick={() => navigate("/admin/products")}
                    icon={
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    }
                />
                <StatCard
                    color="orange"
                    value={lowStockCount}
                    label="Lågt lager"
                    onClick={() => setShowLowStock(!showLowStock)}
                    icon={
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    }
                />
            </div>

            {showLowStock && (() => {
                const lowStockProducts = (products || []).filter((p) => {
                    const stock = getProductStock(p);
                    return stock <= 3;
                });
                return lowStockProducts.length > 0 ? (
                    <div className="bg-white rounded-xl border border-orange-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Lågt lager ({lowStockProducts.length})</h2>
                        <div className="divide-y divide-gray-100">
                            {lowStockProducts.map((p) => (
                                <div key={p.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                                        {p.main_image || (p.images && p.images[0]) ? (
                                            <SmartImage src={p.main_image || p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">—</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900">{p.name}</p>
                                    </div>
                                    <span className="text-sm font-semibold text-orange-600">{getProductStock(p)} kvar</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-500 text-sm">
                        Inga produkter med lågt lager
                    </div>
                );
            })()}

            {/* Cookie Consent Stats */}
            {(consentStats.accepted > 0 || consentStats.declined > 0) && (
                <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Cookie-samtycke</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Accepterat</p>
                            <p className="text-2xl font-bold text-green-600">{consentStats.accepted}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Avvisat</p>
                            <p className="text-2xl font-bold text-red-500">{consentStats.declined}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Acceptansgrad</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {Math.round((consentStats.accepted / (consentStats.accepted + consentStats.declined)) * 100)}%
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Products */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Senaste produkter</h2>
                {recentProducts.length === 0 ? (
                    <p className="text-gray-500 text-sm">Inga produkter ännu</p>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {recentProducts.map((product) => {
                            const stock = getProductStock(product);
                            const isNewActive = product.is_new && (!product.new_until || new Date(product.new_until) > new Date());

                            return (
                                <div key={product.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                                        {product.main_image || (product.images && product.images[0]) ? (
                                            <SmartImage
                                                src={product.main_image || product.images[0]}
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                                Ingen bild
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{product.name}</p>
                                        <p className="text-sm text-gray-500">{product.price} SEK</p>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {isNewActive && (
                                            <span className="bg-green-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                                                {NEW_PRODUCT_LABEL}
                                            </span>
                                        )}
                                        <span className="text-sm text-gray-500 whitespace-nowrap">{stock} i lager</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
