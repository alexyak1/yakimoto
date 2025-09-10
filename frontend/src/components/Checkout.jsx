import React, { useState } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import api from '../api';

// Stripe payment form component with dynamic imports for React 19 compatibility
function StripePaymentForm({ cart, setCart, formData, onSuccess, publishableKey }) {
    console.log('StripePaymentForm received formData:', formData);
    const [isProcessing, setIsProcessing] = useState(false);
    const [stripeLoaded, setStripeLoaded] = useState(false);
    const [stripe, setStripe] = useState(null);
    const [elements, setElements] = useState(null);
    const [CardElement, setCardElement] = useState(null);
    const [Elements, setElementsComponent] = useState(null);

    React.useEffect(() => {
        const loadStripe = async () => {
            try {
                const { loadStripe: loadStripeJS } = await import('@stripe/stripe-js');
                const { Elements: StripeElements, CardElement: StripeCardElement } = await import('@stripe/react-stripe-js');
                
                if (publishableKey) {
                    const stripeInstance = await loadStripeJS(publishableKey);
                    setStripe(stripeInstance);
                    setCardElement(() => StripeCardElement);
                    setElementsComponent(() => StripeElements);
                    setStripeLoaded(true);
                }
            } catch (error) {
                console.error('Failed to load Stripe:', error);
                toast.error("Kunde inte ladda Stripe. Använd Swish eller Bankgiro istället.");
            }
        };
        loadStripe();
    }, [publishableKey]);

    const handleStripeSubmit = async (e) => {
        e.preventDefault();
        
        console.log('Stripe form submitted with formData:', formData);
        
        if (!stripe || !elements) {
            toast.error("Stripe är inte redo än. Försök igen om en stund.");
            return;
        }
        
        // Validate form data
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
            toast.error("Vänligen fyll i alla kunduppgifter (förnamn, efternamn, e-post, telefon) först innan du betalar med kort.");
            return;
        }
        
        setIsProcessing(true);
        
        try {
            // Create payment intent
            const orderData = {
                customer: formData,
                items: cart,
                total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
            };
            
            console.log('Sending order data:', orderData);
            
            const { data } = await api.post('/create-payment-intent', orderData);
            
            // Confirm payment with Stripe
            const { error, paymentIntent } = await stripe.confirmCardPayment(data.client_secret, {
                payment_method: {
                    card: elements.getElement('card'),
                    billing_details: {
                        name: `${formData.firstName} ${formData.lastName}`,
                        email: formData.email,
                        phone: formData.phone,
                    },
                }
            });
            
            if (error) {
                toast.error(error.message);
            } else if (paymentIntent.status === 'succeeded') {
                // Confirm payment with backend
                await api.post('/confirm-payment', {
                    payment_intent_id: paymentIntent.id,
                    order: orderData
                });
                
                toast.success("Betalning genomförd!");
                setCart([]);
                localStorage.removeItem('yakimoto_cart');
                onSuccess();
            }
        } catch (err) {
            console.error('Stripe payment error:', err);
            toast.error("Något gick fel vid betalning. Försök igen.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Create elements when stripe is loaded
    React.useEffect(() => {
        if (stripe && !elements) {
            const elementsInstance = stripe.elements();
            setElements(elementsInstance);
        }
    }, [stripe, elements]);

    if (!stripeLoaded || !CardElement || !stripe || !Elements) {
        return (
            <div className="p-4 border rounded bg-gray-50">
                <h3 className="font-semibold mb-2">Kortuppgifter</h3>
                <p className="text-gray-600">Laddar Stripe...</p>
            </div>
        );
    }

    return (
        <Elements stripe={stripe}>
            <div className="space-y-4">
                <div className="p-4 border rounded">
                    <h3 className="font-semibold mb-2">Kortuppgifter</h3>
                    <CardElement
                        options={{
                            style: {
                                base: {
                                    fontSize: '16px',
                                    color: '#424770',
                                    '::placeholder': {
                                        color: '#aab7c4',
                                    },
                                },
                            },
                        }}
                    />
                </div>
                
                <button
                    type="button"
                    onClick={handleStripeSubmit}
                    disabled={!stripe || !elements || isProcessing}
                    className={`w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 ${
                        !stripe || !elements || isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                    {isProcessing ? 'Bearbetar betalning...' : 'Betala med kort'}
                </button>
            </div>
        </Elements>
    );
}

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
    const [stripePublishableKey, setStripePublishableKey] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((data) => ({ ...data, [name]: value }));
    };

    const choosePayment = (method) => {
        setFormData((data) => ({ ...data, payment: method }));
    };

    // Load Stripe publishable key
    React.useEffect(() => {
        const loadStripeKey = async () => {
            try {
                const { data } = await api.get('/stripe-publishable-key');
                setStripePublishableKey(data.publishable_key);
            } catch (err) {
                console.error('Failed to load Stripe key:', err);
            }
        };
        
        if (cart.length > 0) {
            loadStripeKey();
        }
    }, [cart]);


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
            toast.error("Välj betalningsmetod (Swish, Bankgiro eller Kort).");
            setIsSubmitting(false);
            return;
        }

        if (formData.payment === 'stripe') {
            toast.error("För Stripe-betalning, använd kortformuläret nedan.");
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
                        <div className="flex gap-3 flex-wrap">
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
                            <button
                                type="button"
                                onClick={() => choosePayment('stripe')}
                                className={`px-4 py-2 rounded-lg border transition
                  ${formData.payment === 'stripe' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white hover:bg-gray-50'}`}
                                aria-pressed={formData.payment === 'stripe'}
                            >
                                Kort (Stripe)
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

                        {formData.payment === 'stripe' && (
                            <div className="mt-4">
                                <StripePaymentForm 
                                    cart={cart} 
                                    setCart={setCart} 
                                    formData={formData}
                                    publishableKey={stripePublishableKey}
                                    onSuccess={() => setSuccess(true)}
                                />
                            </div>
                        )}
                    </div>

                    {formData.payment !== 'stripe' && (
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`bg-black text-white px-6 py-2 rounded hover:bg-gray-800 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? 'Skickar...' : 'Slutför beställning'}
                        </button>
                    )}
                </form>
            )}
        </>
    );
}
