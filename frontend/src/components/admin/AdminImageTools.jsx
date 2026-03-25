import React, { useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export default function AdminImageTools({ token }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);

    const checkStatus = async () => {
        setIsProcessing(true);
        setResult(null);
        try {
            const res = await axios.get(`${API_URL}/admin/thumbnail-status`, { headers: { Authorization: `Bearer ${token}` } });
            const status = res.data;
            setResult({
                type: "status",
                message: `${status.thumbnail_count} av ${status.total} bilder har miniatyrer`,
                details: {
                    with: status.with_thumbnails.length,
                    without: status.without_thumbnails.length,
                    missing: status.missing_originals.length,
                },
            });
        } catch (err) {
            setResult({ type: "error", message: err.response?.data?.detail || err.message || "Okänt fel" });
        } finally {
            setIsProcessing(false);
        }
    };

    const deleteThumbnails = async () => {
        if (!confirm("Ta bort alla miniatyrer? Du kan generera nya efteråt.")) return;
        setIsProcessing(true);
        setResult(null);
        try {
            const res = await axios.post(`${API_URL}/admin/delete-thumbnails`, {}, { headers: { Authorization: `Bearer ${token}` } });
            setResult({ type: "success", message: `Raderade ${res.data.deleted} miniatyrer` });
        } catch (err) {
            setResult({ type: "error", message: err.response?.data?.detail || err.message || "Okänt fel" });
        } finally {
            setIsProcessing(false);
        }
    };

    const generateThumbnails = async () => {
        setIsProcessing(true);
        setResult(null);
        try {
            const res = await axios.post(`${API_URL}/admin/generate-thumbnails`, {}, { headers: { Authorization: `Bearer ${token}` } });
            setResult({
                type: "success",
                message: res.data.message,
                processed: res.data.processed,
                skipped: res.data.skipped,
                total: res.data.total,
                errors: res.data.errors,
            });
        } catch (err) {
            setResult({ type: "error", message: err.response?.data?.detail || err.message || "Okänt fel" });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Miniatyrer</h2>
                <p className="text-sm text-gray-500 mb-6">
                    Generera miniatyrer för produktbilder. Detta förbättrar laddningstiderna.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button onClick={checkStatus} disabled={isProcessing} className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isProcessing ? "bg-gray-100 text-gray-400" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        Kontrollera status
                    </button>
                    <button onClick={generateThumbnails} disabled={isProcessing} className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isProcessing ? "bg-gray-100 text-gray-400" : "bg-green-50 text-green-700 hover:bg-green-100"}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {isProcessing ? "Genererar..." : "Generera miniatyrer"}
                    </button>
                    <button onClick={deleteThumbnails} disabled={isProcessing} className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isProcessing ? "bg-gray-100 text-gray-400" : "bg-red-50 text-red-700 hover:bg-red-100"}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Ta bort alla
                    </button>
                </div>
            </div>

            {/* Result */}
            {result && (
                <div className={`bg-white rounded-xl border p-6 ${result.type === "error" ? "border-red-200" : result.type === "status" ? "border-blue-200" : "border-green-200"}`}>
                    <p className={`font-medium ${result.type === "error" ? "text-red-700" : result.type === "status" ? "text-blue-700" : "text-green-700"}`}>{result.message}</p>

                    {result.details && (
                        <div className="mt-3 grid grid-cols-3 gap-4">
                            <div className="bg-green-50 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-green-700">{result.details.with}</p>
                                <p className="text-xs text-green-600">Med miniatyrer</p>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-orange-700">{result.details.without}</p>
                                <p className="text-xs text-orange-600">Utan miniatyrer</p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-red-700">{result.details.missing}</p>
                                <p className="text-xs text-red-600">Saknade original</p>
                            </div>
                        </div>
                    )}

                    {result.processed !== undefined && (
                        <p className="text-sm text-gray-600 mt-2">
                            Bearbetade: {result.processed} | Hoppade över: {result.skipped || 0} | Totalt: {result.total || 0}
                        </p>
                    )}

                    {result.errors && result.errors.length > 0 && (
                        <div className="mt-3 bg-red-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-red-700 mb-1">Fel:</p>
                            <ul className="text-sm text-red-600 list-disc list-inside">
                                {result.errors.slice(0, 5).map((error, idx) => <li key={idx}>{error}</li>)}
                                {result.errors.length > 5 && <li>... och {result.errors.length - 5} fler</li>}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
