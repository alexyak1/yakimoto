import React, { useState } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import api from '../api';

export default function Checkout({ cart, setCart }) {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        payment: '',
    });

    const [success, setSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((data) => ({ ...data, [name]: value }));
    };

    const choosePayment = (method) => {
        setFormData((data) => ({ ...data, payment: method }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSubmitting) return; // prevent second click
        setIsSubmitting(true);

        if (cart.length === 0) {
            toast.error("Din kundvagn är tom.");
            setIsSubmitting(false);
            return;
        }

        if (!formData.payment) {
            toast.error("Välj betalningsmetod (Swish eller Bankgiro).");
            setIsSubmitting(false);
            return;
        }

        const orderData = {
            customer: formData,
            items: cart,
            createdAt: new Date().toISOString(),
        };

        try {
            await api.post('/checkout', orderData);
            toast.success("Beställning skickad!");
            setCart([]);
            localStorage.removeItem('yakimoto_cart');
            setSuccess(true);
        } catch (err) {
            console.error(err);
            toast.error("Något gick fel. Försök igen.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {success ? (
                <div className="max-w-lg mx-auto p-6 text-center">
                    <h2 className="text-2xl font-bold mb-4">Tack för din beställning!</h2>
                    <p className="text-gray-700">
                        Vi kommer att kontakta dig inom kort via e-post eller telefon.
                    </p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto p-4">
                    <h2 className="text-2xl font-bold mb-4">Slutför beställning</h2>

                    <input
                        required
                        placeholder="Förnamn"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full border px-4 py-2 rounded"
                    />
                    <input
                        required
                        placeholder="Efternamn"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="w-full border px-4 py-2 rounded"
                    />
                    <input
                        required
                        type="email"
                        placeholder="E-post"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full border px-4 py-2 rounded"
                    />
                    <input
                        required
                        type="tel"
                        placeholder="Telefonnummer"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full border px-4 py-2 rounded"
                    />

                    {/* Payment toggle buttons */}
                    <div>
                        <h3 className="font-semibold mb-2">Välj betalningsmetod</h3>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => choosePayment('swish')}
                                className={`px-4 py-2 rounded-lg border transition
                  ${formData.payment === 'swish' ? 'bg-green-600 text-white border-green-600' : 'bg-white hover:bg-gray-50'}`}
                                aria-pressed={formData.payment === 'swish'}
                            >
                                Swish
                            </button>
                            <button
                                type="button"
                                onClick={() => choosePayment('bankgiro')}
                                className={`px-4 py-2 rounded-lg border transition
                  ${formData.payment === 'bankgiro' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'}`}
                                aria-pressed={formData.payment === 'bankgiro'}
                            >
                                Bankgiro
                            </button>
                        </div>

                        {/* Dynamic info */}
                        {formData.payment === 'bankgiro' && (
                            <div className="mt-4 p-4 border rounded bg-gray-50">
                                <p className="font-semibold">Betala till Bankgiro:</p>
                                <p className="text-lg tracking-wider">857-9914</p>
                                <p className="text-sm text-gray-600 mt-1">
                                    Ange ditt namn som meddelande.
                                </p>
                            </div>
                        )}

                        {formData.payment === 'swish' && (
                            <div className="mt-4 p-4 border rounded bg-gray-50 flex flex-col items-center">
                                <p className="font-semibold mb-2">Swish-nummer: 070 986 57 19</p>
                                <img
                                    src="/swish-qr.jpg"
                                    alt="Swish QR"
                                    className="w-48 h-48 object-contain"
                                />
                                <p className="text-sm text-gray-600 mt-2">
                                    Skanna QR med Swish eller ange numret manuellt.
                                </p>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`bg-black text-white px-6 py-2 rounded hover:bg-gray-800 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isSubmitting ? 'Skickar...' : 'Slutför beställning'}
                    </button>
                </form>
            )}
        </>
    );
}
