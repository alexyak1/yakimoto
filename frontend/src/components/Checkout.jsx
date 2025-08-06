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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(data => ({ ...data, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (cart.length === 0) {
            toast.error("Din kundvagn är tom.");
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

            // ✅ Clear cart from state and storage
            setCart([]);
            localStorage.removeItem('yakimoto_cart');

            setSuccess(true);
        } catch (err) {
            console.error(err);
            toast.error("Något gick fel. Försök igen.");
        }
    };

    return (
        <>
            <Toaster position="top-right" />
            {success ? (
                <div className="max-w-lg mx-auto p-6 text-center">
                    <h2 className="text-2xl font-bold mb-4">Tack för din beställning!</h2>
                    <p className="text-gray-700">Vi kommer att kontakta dig inom kort via e-post eller telefon.</p>
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

                    <div className="space-x-4">
                        <label>
                            <input
                                type="radio"
                                name="payment"
                                value="swish"
                                checked={formData.payment === 'swish'}
                                onChange={handleChange}
                                required
                            /> Swish
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="payment"
                                value="bankgiro"
                                checked={formData.payment === 'bankgiro'}
                                onChange={handleChange}
                                required
                            /> Bankgiro
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
                    >
                        Slutför beställning
                    </button>
                </form>
            )}
        </>
    );
}
