import React, { useState } from "react";
import { isTokenExpired } from "../../utils/auth";

export default function AdminLogin({ token, login }) {
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        login(password, rememberMe);
    };

    return (
        <div className="min-h-screen bg-[#1e2640] flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white tracking-wider">YAKIMOTO</h1>
                    <p className="text-white/50 text-sm mt-2">Admin Panel</p>
                </div>
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Lösenord</label>
                        <input
                            type="password"
                            placeholder="Ange lösenord"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                        />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-600">Kom ihåg mig (30 dagar)</span>
                    </label>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                    >
                        Logga in
                    </button>
                    {token && isTokenExpired(token) && (
                        <p className="text-sm text-red-500 text-center">
                            Din session har gått ut. Logga in igen.
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}
