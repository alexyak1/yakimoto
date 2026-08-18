import React, { useState, useEffect, useRef } from "react";
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
    { value: "skickad", label: "Skickad" },
];

// Pickup statuses that count as fulfilled (order is out of our hands)
const FULFILLED_PICKUP = new Set(["hamtad", "skickad"]);

function StatusBadge({ paid, pickupStatus }) {
    const fulfilled = FULFILLED_PICKUP.has(pickupStatus);
    if (paid && pickupStatus === "skickad") {
        return (
            <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0" title="Betald · Skickad">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
            </span>
        );
    }
    if (paid && fulfilled) {
        return (
            <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </span>
        );
    }
    if (!paid && !fulfilled) {
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

function OrderModal({ products, customers, onClose, onSave, order }) {
    const isEdit = !!order;
    const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
    const customerInputWrapRef = useRef(null);

    useEffect(() => {
        const onDocClick = (e) => {
            if (customerInputWrapRef.current && !customerInputWrapRef.current.contains(e.target)) {
                setShowCustomerSuggestions(false);
            }
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);
    const [form, setForm] = useState({
        customer_name: order?.customer_name || "",
        customer_email: order?.customer_email || "",
        customer_phone: order?.customer_phone || "",
        payment_method: order?.payment_method || "",
        notes: order?.notes || "",
        payment_status: order?.payment_status || "ej_betald",
        pickup_status: order?.pickup_status || "ej_hamtad",
        delivery_method: order?.delivery_method || "pickup",
        delivery_address: order?.delivery_address || "",
        delivery_postal_code: order?.delivery_postal_code || "",
        delivery_city: order?.delivery_city || "",
        created_at: order?.created_at ? order.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        reduce_stock: true,
    });
    const [items, setItems] = useState(
        order?.items?.length
            ? order.items.map(i => ({ ...i, product_id: i.product_id || "", size: i.size || "", color: i.color || "", quantity: i.quantity || 1, price: i.price || 0, location: i.location || "online" }))
            : [{ product_name: "", size: "", color: "", quantity: 1, price: 0, location: "online" }]
    );
    const [saving, setSaving] = useState(false);

    const addItem = () => setItems([...items, { product_name: "", size: "", color: "", quantity: 1, price: 0, location: "online" }]);
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
                cost: product.cost || 0,
            };
            setItems(updated);
        }
    };

    const handleSave = async () => {
        if (!form.customer_name.trim()) {
            toast.error("Ange kundnamn");
            return;
        }
        if (items.every(i => !i.product_name?.trim())) {
            toast.error("Lägg till minst en produkt");
            return;
        }
        setSaving(true);
        try {
            const { reduce_stock, ...rest } = form;
            const payload = isEdit
                ? { ...rest, items: items.filter(i => i.product_name?.trim()) }
                : { ...rest, reduce_stock, items: items.filter(i => i.product_name?.trim()) };
            await onSave(payload);
            onClose();
        } catch {
            toast.error(isEdit ? "Kunde inte uppdatera order" : "Kunde inte skapa order");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
                <h2 className="text-xl font-bold mb-4">{isEdit ? "Redigera order" : "Ny order"}</h2>

                <div className="space-y-3">
                    <div ref={customerInputWrapRef} className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kund *</label>
                        <input
                            value={form.customer_name}
                            onChange={(e) => {
                                setForm({ ...form, customer_name: e.target.value });
                                setShowCustomerSuggestions(true);
                            }}
                            onFocus={() => setShowCustomerSuggestions(true)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Namn (välj befintlig eller skriv ny)"
                            autoComplete="off"
                        />
                        {showCustomerSuggestions && !isEdit && (() => {
                            const q = form.customer_name.trim().toLowerCase();
                            const matches = (customers || [])
                                .filter(c => !q || c.name.toLowerCase().includes(q))
                                .slice(0, 8);
                            const exact = q && (customers || []).some(c => c.name.toLowerCase() === q);
                            if (!matches.length) return null;
                            return (
                                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {matches.map((c) => (
                                        <button
                                            type="button"
                                            key={c.name}
                                            onClick={() => {
                                                setForm({
                                                    ...form,
                                                    customer_name: c.name,
                                                    customer_email: c.email || form.customer_email,
                                                    customer_phone: c.phone || form.customer_phone,
                                                });
                                                setShowCustomerSuggestions(false);
                                            }}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-2"
                                        >
                                            <span className="truncate">
                                                <span className="font-medium text-gray-900">{c.name}</span>
                                                {(c.email || c.phone) && (
                                                    <span className="text-gray-500 ml-2">{[c.email, c.phone].filter(Boolean).join(" · ")}</span>
                                                )}
                                            </span>
                                            <span className="text-xs text-gray-400 flex-shrink-0">{c.orderCount} {c.orderCount === 1 ? "order" : "ordrar"}</span>
                                        </button>
                                    ))}
                                    {q && !exact && (
                                        <div className="px-3 py-2 text-xs text-gray-400 border-t border-gray-100">
                                            Tryck Enter för att skapa ny kund "{form.customer_name}"
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
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

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Leverans</label>
                        <select
                            value={form.delivery_method}
                            onChange={(e) => setForm({ ...form, delivery_method: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="pickup">Hämtas i klubb</option>
                            <option value="postnord">PostNord leverans</option>
                        </select>
                    </div>

                    {form.delivery_method === "postnord" && (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Gatuadress</label>
                                <input
                                    value={form.delivery_address}
                                    onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Gatuadress"
                                    autoComplete="street-address"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Postnummer</label>
                                    <input
                                        value={form.delivery_postal_code}
                                        onChange={(e) => setForm({ ...form, delivery_postal_code: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Postnummer"
                                        inputMode="numeric"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
                                    <input
                                        value={form.delivery_city}
                                        onChange={(e) => setForm({ ...form, delivery_city: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Ort"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

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

                    {!isEdit && (
                        <label className="flex items-center gap-2 text-sm text-gray-700 select-none cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.reduce_stock}
                                onChange={(e) => setForm({ ...form, reduce_stock: e.target.checked })}
                                className="w-4 h-4"
                            />
                            Minska lager automatiskt
                        </label>
                    )}

                    {/* Items */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Produkter</label>
                        {items.map((item, i) => {
                            const selectedProduct = products.find(p => p.id === Number(item.product_id));
                            const sizeEntries = selectedProduct?.sizes
                                ? Object.entries(selectedProduct.sizes)
                                : [];
                            const locationQty = (size, loc) => {
                                const v = selectedProduct?.sizes?.[size];
                                if (!v) return 0;
                                if (typeof v === "object") return Number(v[loc] || 0);
                                return loc === "online" ? Number(v || 0) : 0;
                            };
                            const availableHere = item.size ? locationQty(item.size, item.location) : null;
                            return (
                                <div key={i} className="border border-gray-200 rounded-lg p-3 mb-2 bg-gray-50">
                                    <div className="flex items-start gap-2">
                                        <select
                                            value={item.product_id || ""}
                                            onChange={(e) => selectProduct(i, e.target.value)}
                                            className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            <option value="">Välj produkt...</option>
                                            {products.map((p) => (
                                                <option key={p.id} value={p.id}>{p.name} — {p.sale_price || p.price} kr</option>
                                            ))}
                                        </select>
                                        {items.length > 1 && (
                                            <button onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700 p-2 flex-shrink-0" aria-label="Ta bort">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Storlek</label>
                                            {sizeEntries.length > 0 ? (
                                                <select
                                                    value={item.size}
                                                    onChange={(e) => updateItem(i, "size", e.target.value)}
                                                    className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                                >
                                                    <option value="">Välj...</option>
                                                    {sizeEntries.map(([sz, v]) => {
                                                        const online = typeof v === "object" ? Number(v.online || 0) : Number(v || 0);
                                                        const club = typeof v === "object" ? Number(v.club || 0) : 0;
                                                        return <option key={sz} value={sz}>{sz} (o:{online} k:{club})</option>;
                                                    })}
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    placeholder="Storlek"
                                                    value={item.size}
                                                    onChange={(e) => updateItem(i, "size", e.target.value)}
                                                    className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Antal</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(i, "quantity", e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Plats</label>
                                            <select
                                                value={item.location || "online"}
                                                onChange={(e) => updateItem(i, "location", e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                            >
                                                <option value="online">Online</option>
                                                <option value="club">Klubb</option>
                                            </select>
                                        </div>
                                    </div>
                                    {availableHere !== null && (
                                        <p className={`text-xs mt-2 ${availableHere < item.quantity ? "text-red-600" : "text-gray-500"}`}>
                                            {availableHere} i lager på {item.location === "club" ? "klubb" : "online"}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
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
                        {saving ? "Sparar..." : isEdit ? "Spara" : "Skapa order"}
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
    const [showModal, setShowModal] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [expandedOrder, setExpandedOrder] = useState(null);
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
        const res = await axios.post(`${API_URL}/orders`, orderData, {
            headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Order skapad");
        const warnings = res.data?.stock_warnings || [];
        if (warnings.length) {
            const msg = warnings
                .map(w => `${w.product_name} (${w.size}): ${w.available} i lager, ${w.requested} beställt`)
                .join("\n");
            toast(`⚠️ Lager räcker inte:\n${msg}`, { duration: 6000, icon: "⚠️" });
        }
        fetchOrders();
    };

    const updateOrder = async (orderData) => {
        await axios.put(`${API_URL}/orders/${editingOrder.id}`, orderData, {
            headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Order uppdaterad");
        fetchOrders();
    };

    // Derive unique customers from orders (latest contact info wins)
    const customers = (() => {
        const byKey = {};
        orders.forEach((o) => {
            const rawName = (o.customer_name || "").trim();
            if (!rawName) return;
            const key = rawName.toLowerCase();
            if (!byKey[key]) {
                byKey[key] = { name: rawName, email: "", phone: "", orderCount: 0 };
            }
            byKey[key].orderCount += 1;
            if (o.customer_email) byKey[key].email = o.customer_email;
            if (o.customer_phone) byKey[key].phone = o.customer_phone;
        });
        return Object.values(byKey).sort((a, b) => b.orderCount - a.orderCount);
    })();

    // Filter orders
    const filtered = orders.filter((o) => {
        if (filter === "ej_betald" && o.payment_status !== "ej_betald") return false;
        if (filter === "betald" && o.payment_status !== "betald") return false;
        if (filter === "ej_hamtad" && o.pickup_status !== "ej_hamtad") return false;
        if (filter === "hamtad" && o.pickup_status !== "hamtad") return false;
        if (filter === "klar" && !(o.payment_status === "betald" && FULFILLED_PICKUP.has(o.pickup_status))) return false;
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
        klar: orders.filter(o => o.payment_status === "betald" && FULFILLED_PICKUP.has(o.pickup_status)).length,
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
                        onClick={() => { setEditingOrder(null); setShowModal(true); }}
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
                            <div key={order.id} className="py-4 first:pt-0 last:pb-0">
                              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                                <div
                                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                    role="button"
                                    title="Visa orderdetaljer"
                                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer rounded-lg hover:bg-gray-50 transition-colors -mx-1 px-1"
                                >
                                    <StatusBadge paid={order.payment_status === "betald"} pickupStatus={order.pickup_status} />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900">
                                            {order.customer_name}
                                            {order.payment_method && (
                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                    {formatPaymentMethod(order.payment_method)}
                                                </span>
                                            )}
                                            <span className="ml-2 text-sm text-gray-400 md:hidden">{formatDate(order.created_at)}</span>
                                        </p>
                                        <p className="text-sm text-gray-500 truncate">
                                            {formatItemsSummary(order.items)}
                                        </p>
                                        {order.notes && (
                                            <p className="text-sm text-gray-400 italic truncate">"{order.notes}"</p>
                                        )}
                                        {order.delivery_method === "postnord" && (
                                            <p className="text-sm text-blue-600 flex items-start gap-1 mt-0.5">
                                                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                </svg>
                                                <span className="truncate">
                                                    {[order.delivery_address, [order.delivery_postal_code, order.delivery_city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "PostNord"}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                    <svg className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform ${expandedOrder === order.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>

                                <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 ml-11 md:ml-0">
                                    <span className="text-sm text-gray-400 hidden md:inline">{formatDate(order.created_at)}</span>

                                    <select
                                        value={order.payment_status}
                                        onChange={(e) => updateStatus(order.id, "payment_status", e.target.value)}
                                        className={`border rounded-lg px-2 md:px-3 py-1.5 md:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                                        className={`border rounded-lg px-2 md:px-3 py-1.5 md:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            order.pickup_status === "hamtad" ? "bg-green-50 border-green-300 text-green-800"
                                                : order.pickup_status === "skickad" ? "bg-blue-50 border-blue-300 text-blue-800"
                                                : "bg-white border-gray-200"
                                        }`}
                                    >
                                        {PICKUP_OPTIONS.map((s) => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>

                                    <button
                                        onClick={() => { setEditingOrder(order); setShowModal(true); }}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Redigera"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
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

                              {expandedOrder === order.id && (
                                  <div className="mt-3 ml-0 md:ml-11 bg-gray-50 rounded-lg p-4">
                                      {/* Items */}
                                      <div className="space-y-2">
                                          {(order.items || []).length === 0 ? (
                                              <p className="text-sm text-gray-400">Inga produkter</p>
                                          ) : (order.items || []).map((item, idx) => (
                                              <div key={idx} className="flex items-start justify-between gap-3 text-sm">
                                                  <div className="min-w-0">
                                                      <p className="text-gray-900">
                                                          {item.product_name || "—"}
                                                          {item.size ? <span className="text-gray-500"> · {item.size}</span> : null}
                                                          {item.color ? <span className="text-gray-500"> · {item.color}</span> : null}
                                                      </p>
                                                      <p className="text-xs text-gray-400">
                                                          {(item.quantity || 1)} × {(item.price || 0).toLocaleString("sv-SE")} kr
                                                          {item.location ? ` · ${item.location === "club" ? "Klubb" : "Online"}` : ""}
                                                      </p>
                                                  </div>
                                                  <span className="text-gray-900 font-medium flex-shrink-0">
                                                      {((item.price || 0) * (item.quantity || 1)).toLocaleString("sv-SE")} kr
                                                  </span>
                                              </div>
                                          ))}
                                      </div>

                                      {/* Totals */}
                                      <div className="border-t border-gray-200 mt-3 pt-3 space-y-1">
                                          {order.delivery_cost > 0 && (
                                              <>
                                                  <div className="flex justify-between text-sm text-gray-600">
                                                      <span>Delsumma</span>
                                                      <span>{(order.items_total || 0).toLocaleString("sv-SE")} kr</span>
                                                  </div>
                                                  <div className="flex justify-between text-sm text-gray-600">
                                                      <span>Leverans</span>
                                                      <span>{(order.delivery_cost || 0).toLocaleString("sv-SE")} kr</span>
                                                  </div>
                                              </>
                                          )}
                                          <div className="flex justify-between text-sm font-semibold text-gray-900">
                                              <span>Totalt</span>
                                              <span>{(order.total || 0).toLocaleString("sv-SE")} kr</span>
                                          </div>
                                      </div>

                                      {/* Contact + delivery */}
                                      <div className="border-t border-gray-200 mt-3 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                          {order.customer_email && (
                                              <p className="text-gray-600"><span className="text-gray-400">E-post:</span> {order.customer_email}</p>
                                          )}
                                          {order.customer_phone && (
                                              <p className="text-gray-600"><span className="text-gray-400">Telefon:</span> {order.customer_phone}</p>
                                          )}
                                          <p className="text-gray-600">
                                              <span className="text-gray-400">Leverans:</span> {order.delivery_method === "postnord" ? "PostNord" : "Hämtas i klubb"}
                                          </p>
                                          {order.delivery_method === "postnord" && (order.delivery_address || order.delivery_city) && (
                                              <p className="text-gray-600">
                                                  <span className="text-gray-400">Adress:</span> {[order.delivery_address, [order.delivery_postal_code, order.delivery_city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
                                              </p>
                                          )}
                                      </div>

                                      <button
                                          onClick={() => { setEditingOrder(order); setShowModal(true); }}
                                          className="mt-3 text-sm text-blue-600 hover:underline"
                                      >
                                          Redigera order
                                      </button>
                                  </div>
                              )}
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
                            const monthProfit = monthOrders.reduce((s, o) =>
                                s + (o.items || []).reduce((is2, item) => {
                                    const itemCost = item.cost || 0;
                                    const itemPrice = item.price || 0;
                                    return is2 + ((itemPrice - itemCost) * (item.quantity || 1));
                                }, 0), 0);

                            // Product breakdown
                            const productTotals = {};
                            monthOrders.forEach((o) => {
                                (o.items || []).forEach((item) => {
                                    const name = item.product_name || "Okänd";
                                    if (!productTotals[name]) productTotals[name] = { qty: 0, revenue: 0, profit: 0 };
                                    const qty = item.quantity || 1;
                                    productTotals[name].qty += qty;
                                    productTotals[name].revenue += (item.price || 0) * qty;
                                    productTotals[name].profit += ((item.price || 0) - (item.cost || 0)) * qty;
                                });
                            });

                            return (
                                <div key={month} className="bg-white rounded-xl border border-gray-100 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-base font-semibold text-gray-900 capitalize">{monthName(month)}</h3>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm text-gray-500">{monthOrders.length} ordrar</span>
                                            <span className="text-base font-bold text-gray-900">{monthRevenue.toLocaleString("sv-SE")} SEK</span>
                                            {monthProfit > 0 && (
                                                <span className="text-sm font-semibold text-green-600">+{monthProfit.toLocaleString("sv-SE")} vinst</span>
                                            )}
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
                                                            {data.profit > 0 && <span className="text-green-600">+{data.profit.toLocaleString("sv-SE")}</span>}
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

            {showModal && (
                <OrderModal
                    products={products}
                    customers={customers}
                    order={editingOrder}
                    onClose={() => { setShowModal(false); setEditingOrder(null); }}
                    onSave={editingOrder ? updateOrder : createOrder}
                />
            )}
        </div>
    );
}
