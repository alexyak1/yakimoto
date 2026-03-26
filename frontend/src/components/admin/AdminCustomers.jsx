import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL;

export default function AdminCustomers({ token, searchQuery }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedCustomer, setExpandedCustomer] = useState(null);
    const [editingCustomer, setEditingCustomer] = useState(null);

    useEffect(() => {
        axios.get(`${API_URL}/orders`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setOrders(res.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    // Group orders by customer name (normalized)
    const customers = {};
    orders.forEach(o => {
        const rawName = (o.customer_name || "Okänd").trim();
        const key = rawName.toLowerCase();
        if (!customers[key]) {
            customers[key] = {
                name: rawName,
                email: o.customer_email || "",
                phone: o.customer_phone || "",
                orders: [],
                totalSpent: 0,
            };
        }
        customers[key].orders.push(o);
        customers[key].totalSpent += o.total || 0;
        // Keep latest contact info
        if (o.customer_email) customers[key].email = o.customer_email;
        if (o.customer_phone) customers[key].phone = o.customer_phone;
    });

    const customerList = Object.values(customers)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .filter(c => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q);
        });

    const formatDate = (isoStr) => {
        if (!isoStr) return "";
        const d = new Date(isoStr);
        return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
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
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <p className="text-2xl font-bold text-gray-900">{customerList.length}</p>
                    <p className="text-sm text-gray-500">Kunder</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                    <p className="text-sm text-gray-500">Totala ordrar</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <p className="text-2xl font-bold text-gray-900">
                        {customerList.length > 0 ? (orders.length / customerList.length).toFixed(1) : 0}
                    </p>
                    <p className="text-sm text-gray-500">Ordrar per kund</p>
                </div>
            </div>

            {/* Customer list */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Kunder</h2>

                {customerList.length === 0 ? (
                    <p className="text-gray-500 text-sm py-8 text-center">Inga kunder hittades</p>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {customerList.map((customer) => (
                            <div key={customer.name}>
                                <div
                                    onClick={() => setExpandedCustomer(expandedCustomer === customer.name ? null : customer.name)}
                                    className="flex items-center gap-3 md:gap-4 py-4 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                                >
                                    <div className="w-9 h-9 md:w-10 md:h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                                        {customer.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{customer.name}</p>
                                        <p className="text-xs md:text-sm text-gray-500 truncate">
                                            {[customer.email, customer.phone].filter(Boolean).join(" · ") || "Ingen kontaktinfo"}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-gray-900">{customer.totalSpent.toLocaleString("sv-SE")} SEK</p>
                                            <p className="text-xs text-gray-500">{customer.orders.length} {customer.orders.length === 1 ? "order" : "ordrar"}</p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setEditingCustomer(customer); }}
                                            className="p-1.5 md:p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Redigera kund"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <svg className={`w-4 h-4 md:w-5 md:h-5 text-gray-400 transition-transform ${expandedCustomer === customer.name ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>

                                {expandedCustomer === customer.name && (
                                    <div className="ml-0 md:ml-14 mb-4 bg-gray-50 rounded-lg p-4 overflow-x-auto">
                                        <table className="w-full text-sm min-w-[400px]">
                                            <thead>
                                                <tr className="text-left text-gray-500 border-b border-gray-200">
                                                    <th className="pb-2 font-medium">Datum</th>
                                                    <th className="pb-2 font-medium">Produkter</th>
                                                    <th className="pb-2 font-medium">Betalning</th>
                                                    <th className="pb-2 font-medium text-right">Belopp</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {customer.orders.map(o => (
                                                    <tr key={o.id}>
                                                        <td className="py-2 text-gray-600">{formatDate(o.created_at)}</td>
                                                        <td className="py-2 text-gray-900">
                                                            {(o.items || []).map(i => i.product_name).join(", ") || "—"}
                                                        </td>
                                                        <td className="py-2">
                                                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                                                o.payment_status === "betald" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                                            }`}>
                                                                {o.payment_status === "betald" ? "Betald" : "Ej betald"}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 text-gray-900 text-right font-medium">{(o.total || 0).toLocaleString("sv-SE")} kr</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {editingCustomer && <EditCustomerModal
                customer={editingCustomer}
                token={token}
                onClose={() => setEditingCustomer(null)}
                onSaved={() => {
                    setEditingCustomer(null);
                    setLoading(true);
                    axios.get(`${API_URL}/orders`, { headers: { Authorization: `Bearer ${token}` } })
                        .then(res => setOrders(res.data))
                        .catch(() => {})
                        .finally(() => setLoading(false));
                }}
            />}
        </div>
    );
}

function EditCustomerModal({ customer, token, onClose, onSaved }) {
    const [form, setForm] = useState({
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put(`${API_URL}/orders/customer/update`, {
                old_name: customer.name,
                ...form,
            }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Kund uppdaterad");
            onSaved();
        } catch {
            toast.error("Kunde inte uppdatera kund");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold mb-4">Redigera kund</h2>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Namn</label>
                        <input
                            value={form.customer_name}
                            onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
                        <input
                            value={form.customer_email}
                            onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                        <input
                            value={form.customer_phone}
                            onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">Uppdaterar alla ordrar för denna kund</p>
                <div className="flex justify-end gap-3 mt-5">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                        Avbryt
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving ? "Sparar..." : "Spara"}
                    </button>
                </div>
            </div>
        </div>
    );
}
