import React, { useState, useEffect } from "react";

const CONSENT_KEY = "yakimoto_cookie_consent";
const API_URL = import.meta.env.VITE_API_URL;

export function getCookieConsent() {
    return localStorage.getItem(CONSENT_KEY) || sessionStorage.getItem(CONSENT_KEY);
}

function logConsent(action) {
    fetch(`${API_URL}/consent-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
    }).catch(() => {});
}

export default function CookieConsent({ onAccept }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!getCookieConsent()) {
            setVisible(true);
        }
    }, []);

    const accept = () => {
        localStorage.setItem(CONSENT_KEY, "accepted");
        setVisible(false);
        logConsent("accepted");
        onAccept();
    };

    const decline = () => {
        sessionStorage.setItem(CONSENT_KEY, "declined");
        setVisible(false);
        logConsent("declined");
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-lg">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
                <p className="text-sm text-gray-700 flex-1">
                    Vi använder cookies för att analysera trafik och förbättra din upplevelse.
                    Läs mer i vår{" "}
                    <a href="/integritetspolicy" className="underline text-blue-600 hover:text-blue-800">
                        integritetspolicy
                    </a>.
                </p>
                <div className="flex gap-3 flex-shrink-0">
                    <button
                        onClick={decline}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Avvisa
                    </button>
                    <button
                        onClick={accept}
                        className="px-4 py-2 text-sm text-white bg-black rounded-lg hover:bg-gray-800"
                    >
                        Acceptera
                    </button>
                </div>
            </div>
        </div>
    );
}
