import React from "react";

export default function AdminSettings({ logout }) {
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Konto</h2>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                        <p className="font-medium text-gray-900">Admin</p>
                        <p className="text-sm text-gray-500">Inloggad som administratör</p>
                    </div>
                    <button onClick={logout} className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                        Logga ut
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Om</h2>
                <div className="text-sm text-gray-500 space-y-1">
                    <p>Yakimoto Admin Panel</p>
                    <p>Version 2.0</p>
                </div>
            </div>
        </div>
    );
}
