import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL;

const PAYMENT_OPTIONS = [
    { value: "ej_betald", label: "Ej betald" },
    { value: "betald", label: "Betald" },
];

const PICKUP_OPTIONS = [
    { value: "ej_hamtad", label: "Ej hämtad" },
    { value: "hamtad", label: "Hämtad" },
];

function StatusBadge({ paid, pickedUp }) {
    if (paid && pickedUp) {
        return (
            <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </span>
        );
    }
    if (!paid && !pickedUp) {
        return (
            <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </span>
        );
    }
    if (!paid) {
        return (
            <span className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </span>
        );
    }
    return (
        <span className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        </span>
    );
}

function NewOrderModal({ products, onClose, onSave }) {
    const [form, setForm] = useState({
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        payment_method: "",
        notes: "",
        payment_status: "ej_betald",
        pickup_status: "ej_hamtad",
        created_at: new Date().toISOString().slice(0, 10),
    });
    const [items, setItems] = useState([{ product_name: "", size: "", color: "", quantity: 1, price: 0 }]);
    const [saving, setSaving] = useState(false);

    const addItem = () => setItems([...items, { product_name: "", size: "", color: "", quantity: 1, price: 0 }]);
    const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
    const updateItem = (i, field, value) => {
        const updated = [...items];
        updated[i][field] = field === "quantity" || field === "price" ? Number(value) : value;
        setItems(updated);
    };

    const selectProduct = (i, productId) => {
        const product = products.find(p => p.id === Number(productId));
        if (product) {
            const updated = [...items];
            updated[i] = {
                ...updated[i],
                product_id: product.id,
                product_name: product.name,
                price: product.sale_price || product.price,
                color: product.color || "",
            };
            setItems(updated);
        }
    };

    const handleSave = async () => {
        if (!form.customer_name.trim()) {
            toast.error("Ange kundnamn");
            return;
        }
        if (items.every(i => !i.product_name.trim())) {
            toast.error("Lägg till minst en produkt");
            return;
        }
        setSaving(true);
        try {
            await onSave({ ...form, items: items.filter(i => i.product_name.trim()) });
            onClose();
        } catch {
            toast.error("Kunde inte skapa order");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
                <h2 className="text-xl font-bold mb-4">Ny order</h2>

                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kund *</label>
                        <input
                            value={form.customer_name}
                            onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Namn"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
                            <input
                                value={form.customer_email}
                                onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="E-post"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                            <input
                                value={form.customer_phone}
                                onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Telefon"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Betalmetod</label>
                        <select
                            value={form.payment_method}
                            onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Välj...</option>
                            <option value="swish">Swish</option>
                            <option value="stripe">Kort (Stripe)</option>
                            <option value="bankgiro">Bankgiro</option>
                            <option value="kontant">Kontant</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Betald?</label>
                            <select
                                value={form.payment_status}
                                onChange={(e) => setForm({ ...form, payment_status: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {PAYMENT_OPTIONS.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hämtad?</label>
                            <select
                                value={form.pickup_status}
                                onChange={(e) => setForm({ ...form, pickup_status: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {PICKUP_OPTIONS.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                            <input
                                type="date"
                                value={form.created_at}
                                onChange={(e) => setForm({ ...form, created_at: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Anteckning</label>
                            <input
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder='T.ex. "Hämtar på torsdag"'
                            />
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Produkter</label>
                        {items.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 mb-2">
                                <select
                                    value={item.product_id || ""}
                                    onChange={(e) => selectProduct(i, e.target.value)}
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Välj produkt...</option>
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name} — {p.sale_price || p.price} kr</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    placeholder="Storlek"
                                    value={item.size}
                                    onChange={(e) => updateItem(i, "size", e.target.value)}
                                    className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(i, "quantity", e.target.value)}
                                    className="w-14 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {items.length > 1 && (
                                    <button onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700 p-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}
                        <button onClick={addItem} className="text-blue-600 text-sm hover:underline mt-1">
                            + Lägg till produkt
                        </button>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                        Avbryt
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving ? "Sparar..." : "Skapa order"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AdminOrders({ products, token, searchQuery }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("alla");
    const [showNewModal, setShowNewModal] = useState(false);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 10;

    const fetchOrders = async () => {
        try {
            const res = await axios.get(`${API_URL}/orders`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setOrders(res.data);
        } catch (err) {
            console.error("Failed to fetch orders", err);
            toast.error("Kunde inte hämta ordrar");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const updateStatus = async (orderId, field, value) => {
        try {
            await axios.put(`${API_URL}/orders/${orderId}/status`, { [field]: value }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setOrders(orders.map(o => o.id === orderId ? { ...o, [field]: value } : o));
        } catch {
            toast.error("Kunde inte uppdatera status");
        }
    };

    const deleteOrder = async (orderId) => {
        if (!confirm("Är du säker på att du vill ta bort denna order?")) return;
        try {
            await axios.delete(`${API_URL}/orders/${orderId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setOrders(orders.filter(o => o.id !== orderId));
            toast.success("Order borttagen");
        } catch {
            toast.error("Kunde inte ta bort order");
        }
    };

    const createOrder = async (orderData) => {
        await axios.post(`${API_URL}/orders`, orderData, {
            headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Order skapad");
        fetchOrders();
    };

    // Filter orders
    const filtered = orders.filter((o) => {
        if (filter === "ej_betald" && o.payment_status !== "ej_betald") return false;
        if (filter === "betald" && o.payment_status !== "betald") return false;
        if (filter === "ej_hamtad" && o.pickup_status !== "ej_hamtad") return false;
        if (filter === "hamtad" && o.pickup_status !== "hamtad") return false;
        if (filter === "klar" && !(o.payment_status === "betald" && o.pickup_status === "hamtad")) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
                (o.customer_name || "").toLowerCase().includes(q) ||
                (o.items || []).some(i => (i.product_name || "").toLowerCase().includes(q))
            );
        }
        return true;
    });

    // Reset page when filter or search changes
    useEffect(() => { setPage(0); }, [filter, searchQuery]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    // Counts for filter tabs
    const counts = {
        alla: orders.length,
        ej_betald: orders.filter(o => o.payment_status === "ej_betald").length,
        ej_hamtad: orders.filter(o => o.pickup_status === "ej_hamtad").length,
        klar: orders.filter(o => o.payment_status === "betald" && o.pickup_status === "hamtad").length,
    };



    const formatPaymentMethod = (method) => {
        const methods = { swish: "Swish", stripe: "Kort", bankgiro: "Bankgiro", kontant: "Kontant", faktura: "Faktura" };
        return methods[method] || method;
    };

    const formatDate = (isoStr) => {
        if (!isoStr) return "";
        const d = new Date(isoStr);
        return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
    };

    const formatItemsSummary = (items) => {
        if (!items || items.length === 0) return "";
        const first = items[0];
        let text = first.product_name;
        if (first.size) text += ` — ${first.size}`;
        if (first.quantity > 1) text += ` — ${first.quantity} st`;
        else text += " — 1 st";
        if (items.length > 1) text += ` (+${items.length - 1})`;
        return text;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filter tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { key: "alla", label: "Alla" },
                    { key: "ej_betald", label: "Ej betald" },
                    { key: "ej_hamtad", label: "Ej hämtad" },
                    { key: "klar", label: "Klar ✓" },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`p-4 rounded-xl border text-left transition-colors ${
                            filter === tab.key
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-100 bg-white hover:border-gray-200"
                        }`}
                    >
                        <p className="text-2xl font-bold text-gray-900">{counts[tab.key]}</p>
                        <p className="text-sm text-gray-500">{tab.label}</p>
                    </button>
                ))}
            </div>

            {/* Orders list */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Ordrar</h2>
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Ny order
                    </button>
                </div>

                {paginated.length === 0 ? (
                    <p className="text-gray-500 text-sm py-8 text-center">Inga ordrar hittades</p>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {paginated.map((order) => (
                            <div key={order.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                                <StatusBadge paid={order.payment_status === "betald"} pickedUp={order.pickup_status === "hamtad"} />

                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900">
                                        {order.customer_name}
                                        {order.payment_method && (
                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                {formatPaymentMethod(order.payment_method)}
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-sm text-gray-500 truncate">
                                        {formatItemsSummary(order.items)}
                                    </p>
                                    {order.notes && (
                                        <p className="text-sm text-gray-400 italic truncate">"{order.notes}"</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="text-sm text-gray-400">{formatDate(order.created_at)}</span>

                                    <select
                                        value={order.payment_status}
                                        onChange={(e) => updateStatus(order.id, "payment_status", e.target.value)}
                                        className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            order.payment_status === "betald" ? "bg-green-50 border-green-300 text-green-800" : "bg-white border-gray-200"
                                        }`}
                                    >
                                        {PAYMENT_OPTIONS.map((s) => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={order.pickup_status}
                                        onChange={(e) => updateStatus(order.id, "pickup_status", e.target.value)}
                                        className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            order.pickup_status === "hamtad" ? "bg-green-50 border-green-300 text-green-800" : "bg-white border-gray-200"
                                        }`}
                                    >
                                        {PICKUP_OPTIONS.map((s) => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>

                                    <button
                                        onClick={() => deleteOrder(order.id)}
                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Ta bort"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
                        <p className="text-sm text-gray-500">
                            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} av {filtered.length}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(page - 1)}
                                disabled={page === 0}
                                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Föregående
                            </button>
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={page >= totalPages - 1}
                                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Nästa
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Monthly breakdown */}
            {orders.length > 0 && (() => {
                const byMonth = {};
                orders.forEach((o) => {
                    const d = o.created_at ? new Date(o.created_at) : new Date();
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                    if (!byMonth[key]) byMonth[key] = [];
                    byMonth[key].push(o);
                });
                const sortedMonths = Object.keys(byMonth).sort().reverse();

                const monthName = (key) => {
                    const [y, m] = key.split("-");
                    const date = new Date(y, parseInt(m) - 1);
                    return date.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
                };

                return (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">Per månad</h2>
                        {sortedMonths.map((month) => {
                            const monthOrders = byMonth[month];
                            const monthRevenue = monthOrders.reduce((s, o) => s + (o.total || 0), 0);

                            // Product breakdown
                            const productTotals = {};
                            monthOrders.forEach((o) => {
                                (o.items || []).forEach((item) => {
                                    const name = item.product_name || "Okänd";
                                    if (!productTotals[name]) productTotals[name] = { qty: 0, revenue: 0 };
                                    productTotals[name].qty += item.quantity || 1;
                                    productTotals[name].revenue += (item.price || 0) * (item.quantity || 1);
                                });
                            });

                            return (
                                <div key={month} className="bg-white rounded-xl border border-gray-100 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-base font-semibold text-gray-900 capitalize">{monthName(month)}</h3>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm text-gray-500">{monthOrders.length} ordrar</span>
                                            <span className="text-base font-bold text-gray-900">{monthRevenue.toLocaleString("sv-SE")} SEK</span>
                                        </div>
                                    </div>

                                    {/* Orders table */}
                                    <table className="w-full text-sm mb-4">
                                        <thead>
                                            <tr className="text-left text-gray-500 border-b border-gray-100">
                                                <th className="pb-2 font-medium">Produkt</th>
                                                <th className="pb-2 font-medium">Kund</th>
                                                <th className="pb-2 font-medium text-right">Pris</th>
                                                <th className="pb-2 font-medium text-right">Datum</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {monthOrders.map((o) => (
                                                <tr key={o.id}>
                                                    <td className="py-2 text-gray-900">
                                                        {(o.items || []).map((i) => i.product_name).join(", ") || "—"}
                                                    </td>
                                                    <td className="py-2 text-gray-600">{o.customer_name}</td>
                                                    <td className="py-2 text-gray-900 text-right">{(o.total || 0).toLocaleString("sv-SE")} kr</td>
                                                    <td className="py-2 text-gray-400 text-right">{formatDate(o.created_at)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Product breakdown */}
                                    {Object.keys(productTotals).length > 0 && (
                                        <div className="border-t border-gray-100 pt-3">
                                            <p className="text-xs font-medium text-gray-500 mb-2">Produktfördelning</p>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(productTotals)
                                                    .sort((a, b) => b[1].revenue - a[1].revenue)
                                                    .map(([name, data]) => (
                                                        <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 rounded-lg text-xs text-gray-700">
                                                            {name} <span className="text-gray-400">x{data.qty}</span> <span className="font-medium">{data.revenue.toLocaleString("sv-SE")} kr</span>
                                                        </span>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })()}

            {showNewModal && (
                <NewOrderModal
                    products={products}
                    onClose={() => setShowNewModal(false)}
                    onSave={createOrder}
                />
            )}
        </div>
    );
}
