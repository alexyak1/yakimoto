import React, { useState } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import api from '../api';

// Stripe payment form component
function StripePaymentForm({ cart, setCart, formData, onSuccess, publishableKey, clientSecret }) {
    console.log('StripePaymentForm received formData:', formData);
    const [isProcessing, setIsProcessing] = useState(false);
    const [stripeLoaded, setStripeLoaded] = useState(false);
    const [stripe, setStripe] = useState(null);
    const [Elements, setElementsComponent] = useState(null);
    const [PaymentElement, setPaymentElement] = useState(null);
    const [useElements, setUseElements] = useState(null);

    React.useEffect(() => {
        const loadStripe = async () => {
            try {
                const { loadStripe: loadStripeJS } = await import('@stripe/stripe-js');
                const { Elements: StripeElements, PaymentElement: StripePaymentElement, useElements: StripeUseElements } = await import('@stripe/react-stripe-js');
                
                if (publishableKey) {
                    const stripeInstance = await loadStripeJS(publishableKey);
                    setStripe(stripeInstance);
                    setElementsComponent(() => StripeElements);
                    setPaymentElement(() => StripePaymentElement);
                    setUseElements(() => StripeUseElements);
                    setStripeLoaded(true);
                }
            } catch (error) {
                console.error('Failed to load Stripe:', error);
                toast.error("Kunde inte ladda Stripe. Använd Swish eller Bankgiro istället.");
            }
        };
        loadStripe();
    }, [publishableKey]);

    // Inner component that can use useElements hook
    const StripeFormInner = () => {
        const elements = useElements();
        
        const handleSubmit = async (e) => {
            e.preventDefault();
            
            console.log('Stripe form submitted with formData:', formData);
            console.log('Elements object:', elements);
            
            if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
                toast.error("Vänligen fyll i alla kunduppgifter (förnamn, efternamn, e-post, telefon) först innan du betalar med kort.");
                return;
            }

            if (!stripe || !elements) {
                toast.error("Stripe är inte redo än. Försök igen om en stund.");
                return;
            }

            setIsProcessing(true);

            try {
                const orderData = {
                    customer: formData,
                    items: cart,
                    total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
                };
                
                console.log('Confirming payment with client secret:', clientSecret);
                
                // Confirm payment with Stripe using PaymentElement
                const { error, paymentIntent } = await stripe.confirmPayment({
                    elements,
                    confirmParams: {
                        return_url: window.location.origin + '/checkout',
                    },
                });
                
                if (error) {
                    console.log('Stripe payment error:', error);
                    toast.error(`Betalningsfel: ${error.message}`);
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
                toast.error("Ett fel uppstod vid betalningen. Försök igen.");
            } finally {
                setIsProcessing(false);
            }
        };

        return (
            <div className="space-y-4">
                <div className="p-4 border rounded">
                    <h3 className="font-semibold mb-2">Kortuppgifter</h3>
                    <PaymentElement
                        options={{
                            layout: 'tabs',
                        }}
                    />
                </div>
                
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!stripe || !elements || isProcessing}
                    className={`w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 ${
                        !stripe || !elements || isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                    {isProcessing ? 'Bearbetar betalning...' : 'Betala med kort'}
                </button>
            </div>
        );
    };

    if (!stripeLoaded || !PaymentElement || !stripe || !Elements || !useElements || !clientSecret) {
        return (
            <div className="p-4 border rounded bg-gray-50">
                <h3 className="font-semibold mb-2">Kortuppgifter</h3>
                <p className="text-gray-600">Laddar Stripe...</p>
            </div>
        );
    }

    console.log('Rendering Elements with clientSecret:', clientSecret);
    return (
        <Elements key={clientSecret} stripe={stripe} options={{ clientSecret }}>
            <StripeFormInner />
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
    const [clientSecret, setClientSecret] = useState(null);
    const [paymentIntentCreated, setPaymentIntentCreated] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((data) => ({ ...data, [name]: value }));
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

    // Create payment intent when form data is ready (only once)
    React.useEffect(() => {
        const createPaymentIntent = async () => {
            if (stripePublishableKey && cart.length > 0 && formData.firstName && formData.lastName && formData.email && formData.phone && !clientSecret) {
                try {
                    const orderData = {
                        customer: formData,
                        items: cart,
                        total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
                    };
                    
                    const { data } = await api.post('/create-payment-intent', orderData);
                    setClientSecret(data.client_secret);
                    setPaymentIntentCreated(true);
                } catch (error) {
                    console.error('Failed to create payment intent:', error);
                }
            }
        };
        
        createPaymentIntent();
    }, [stripePublishableKey, cart, formData, clientSecret]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSubmitting) return; // prevent second click
        setIsSubmitting(true);

        try {
            const orderData = {
                customer: formData,
                items: cart,
                total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
            };

            if (formData.payment === 'stripe') {
                // Stripe payment is handled by StripePaymentForm component
                return;
            }

            // Handle Swish and Bankgiro payments
            const { data } = await api.post('/checkout', orderData);
            
            if (data.success) {
                toast.success("Beställning skickad! Du kommer få instruktioner via e-post.");
                setCart([]);
                localStorage.removeItem('yakimoto_cart');
                setSuccess(true);
            } else {
                toast.error("Ett fel uppstod. Försök igen.");
            }
        } catch (error) {
            console.error('Checkout error:', error);
            toast.error("Ett fel uppstod vid beställningen. Försök igen.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="max-w-lg mx-auto p-4 text-center">
                <h2 className="text-2xl font-bold text-green-600 mb-4">Tack för din beställning!</h2>
                <p className="text-gray-600 mb-4">
                    Du kommer få instruktioner för betalning via e-post.
                </p>
                <button
                    onClick={() => window.location.href = '/'}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                >
                    Tillbaka till startsidan
                </button>
            </div>
        );
    }

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <Toaster position="top-right" />
            <div className="max-w-4xl mx-auto px-4">
                <h1 className="text-3xl font-bold text-center mb-8">Kassa</h1>
                
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Order Summary */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-4">Din beställning</h2>
                        <div className="space-y-4">
                            {cart.map((item) => (
                                <div key={`${item.id}-${item.selectedSize}`} className="flex items-center space-x-4 border-b pb-4">
                                    <img 
                                        src={item.image || '/images/placeholder.jpg'} 
                                        alt={item.name}
                                        className="w-16 h-16 object-cover rounded"
                                    />
                                    <div className="flex-1">
                                        <h3 className="font-medium">{item.name}</h3>
                                        <p className="text-gray-600">Storlek: {item.selectedSize}</p>
                                        <p className="text-gray-600">Antal: {item.quantity}</p>
                                        <p className="font-semibold">{item.price * item.quantity} kr</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 pt-4 border-t">
                            <div className="flex justify-between text-xl font-bold">
                                <span>Totalt:</span>
                                <span>{total} kr</span>
                            </div>
                        </div>
                    </div>

                    {/* Checkout Form */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-4">Kunduppgifter</h2>
                        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto p-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Förnamn *
                                </label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Efternamn *
                                </label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    E-post *
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Telefon *
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-4">
                                    Betalningsmetod *
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="payment"
                                            value="swish"
                                            checked={formData.payment === 'swish'}
                                            onChange={handleChange}
                                            className="mr-2"
                                        />
                                        Swish
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="payment"
                                            value="bankgiro"
                                            checked={formData.payment === 'bankgiro'}
                                            onChange={handleChange}
                                            className="mr-2"
                                        />
                                        Bankgiro
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="payment"
                                            value="stripe"
                                            checked={formData.payment === 'stripe'}
                                            onChange={handleChange}
                                            className="mr-2"
                                        />
                                        Kort (Stripe)
                                    </label>
                                </div>
                            </div>

                            <div className="mt-4">
                                {formData.payment === 'stripe' && (
                                    <div className="mt-4">
                                        <StripePaymentForm 
                                            cart={cart} 
                                            setCart={setCart} 
                                            formData={formData}
                                            publishableKey={stripePublishableKey}
                                            clientSecret={clientSecret}
                                            onSuccess={() => setSuccess(true)}
                                        />
                                    </div>
                                )}
                            </div>

                            {formData.payment !== 'stripe' && (
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 ${
                                        isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                >
                                    {isSubmitting ? 'Skickar beställning...' : 'Skicka beställning'}
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}