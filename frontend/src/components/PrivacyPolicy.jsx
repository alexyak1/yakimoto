import React from "react";

export default function PrivacyPolicy() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold mb-8">Integritetspolicy</h1>
            <p className="text-sm text-gray-500 mb-8">Senast uppdaterad: 2026-03-25</p>

            <div className="space-y-8 text-gray-700 leading-relaxed">
                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">Vem ansvarar för dina uppgifter?</h2>
                    <p>
                        Yakimoto Dojo ("vi", "oss") är personuppgiftsansvarig för de uppgifter som samlas
                        in via yakimoto.se.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">Vilka uppgifter samlar vi in?</h2>
                    <p>Vid köp samlar vi in:</p>
                    <ul className="list-disc ml-6 mt-2 space-y-1">
                        <li>Namn</li>
                        <li>E-postadress</li>
                        <li>Telefonnummer</li>
                        <li>Beställningsinformation (produkter, belopp, betalmetod)</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">Varför samlar vi in uppgifterna?</h2>
                    <ul className="list-disc ml-6 space-y-1">
                        <li>För att hantera och leverera din beställning</li>
                        <li>För att skicka orderbekräftelse via e-post</li>
                        <li>För att kunna kontakta dig vid frågor om din order</li>
                    </ul>
                    <p className="mt-2">
                        Rättslig grund: fullgörande av avtal (GDPR art. 6.1 b).
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">Cookies och analys</h2>
                    <p>
                        Vi använder Google Analytics och Google Ads för att analysera trafik och mäta
                        annonsresultat. Dessa tjänster sätter cookies i din webbläsare. Cookies laddas
                        först efter att du gett ditt samtycke via cookiebannern.
                    </p>
                    <p className="mt-2">
                        Du kan när som helst återkalla ditt samtycke genom att rensa cookies i din
                        webbläsare.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">Betalning</h2>
                    <p>
                        Kortbetalningar hanteras av Stripe. Vi lagrar inga kortuppgifter. Stripe
                        behandlar dina uppgifter enligt sin egen integritetspolicy.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">Hur länge sparar vi uppgifterna?</h2>
                    <p>
                        Orderuppgifter sparas så länge det behövs för att fullgöra beställningen och
                        uppfylla bokföringskrav (normalt 7 år enligt bokföringslagen).
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">Dina rättigheter</h2>
                    <p>Enligt GDPR har du rätt att:</p>
                    <ul className="list-disc ml-6 mt-2 space-y-1">
                        <li>Begära tillgång till dina personuppgifter</li>
                        <li>Begära rättelse av felaktiga uppgifter</li>
                        <li>Begära radering av dina uppgifter</li>
                        <li>Invända mot behandling av dina uppgifter</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">Kontakt</h2>
                    <p>
                        Har du frågor om hur vi hanterar dina uppgifter? Kontakta oss
                        på <a href="mailto:iakimchuk.a@gmail.com" className="underline text-blue-600 hover:text-blue-800">iakimchuk.a@gmail.com</a>.
                    </p>
                </section>
            </div>
        </div>
    );
}
