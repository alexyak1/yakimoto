// StripePaymentForm.jsx
import React, { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { toast } from 'react-hot-toast';
import api from '../api';
import { trackPurchase } from '../analytics';

export default function StripePaymentForm({ cart, setCart, formData, onSuccess, onValidationError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState(false);

  const handleCardChange = (event) => {
    // Clear error when user starts typing
    if (cardError && event.complete) {
      setCardError(false);
    }
  };

  const handleStripeSubmit = async () => {
    console.log('Stripe form submitted!');
    console.log('Stripe ready:', !!stripe);
    console.log('Elements ready:', !!elements);

    // Validate required fields and highlight missing ones
    const missingFields = [];
    if (!formData.firstName) missingFields.push('förnamn');
    if (!formData.lastName) missingFields.push('efternamn');
    if (!formData.email) missingFields.push('e-post');
    if (!formData.phone) missingFields.push('telefon');
    
    if (missingFields.length > 0) {
      // Highlight missing fields
      const errors = {};
      if (!formData.firstName) errors.firstName = true;
      if (!formData.lastName) errors.lastName = true;
      if (!formData.email) errors.email = true;
      if (!formData.phone) errors.phone = true;
      
      onValidationError?.(errors);
      toast.error(`Vänligen fyll i alla obligatoriska fält: ${missingFields.join(', ')}.`);
      return;
    }

    if (!stripe || !elements) {
      toast.error('Stripe är inte redo än. Försök igen om en stund.');
      return;
    }

    // Clear any previous card errors
    setCardError(false);
    setIsProcessing(true);

    try {
      // Calculate delivery cost
      const deliveryCost = formData.deliveryMethod === 'postnord' ? 82 : 0;
      const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const total = itemsTotal + deliveryCost;

      const orderData = {
        customer: formData,
        items: cart,
        deliveryMethod: formData.deliveryMethod,
        deliveryCost: deliveryCost,
        itemsTotal: itemsTotal,
        total: total,
      };

      const { data } = await api.post('/create-payment-intent', orderData);
      const clientSecret = data.client_secret;

      const card = elements.getElement(CardElement);
      if (!card) {
        toast.error('Kunde inte hitta kortfältet.');
        return;
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card,
          billing_details: {
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            phone: formData.phone,
          },
        },
      });

      if (error) {
        setCardError(true);
        toast.error(error.message || 'Betalning misslyckades.');
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        await api.post('/confirm-payment', {
          payment_intent_id: paymentIntent.id,
          order: orderData,
        });

        // Track purchase event
        const items = cart.map(item => ({
          item_id: item.id,
          item_name: item.name,
          item_category: item.category || 'Product',
          quantity: item.quantity,
          price: item.price,
        }));
        
        trackPurchase(paymentIntent.id, total, 'SEK', items);

        toast.success('Betalning genomförd!');
        setCart([]);
        localStorage.removeItem('yakimoto_cart');
        onSuccess?.();
      }
    } catch (err) {
      console.error('Stripe payment error:', err);
      setCardError(true);
      toast.error('Något gick fel vid betalning. Försök igen.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`p-4 border rounded ${cardError ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}>
        <h3 className="font-semibold mb-2">Kortuppgifter</h3>
        <CardElement 
          onChange={handleCardChange}
          options={{ 
            style: { 
              base: { 
                fontSize: '16px',
                color: cardError ? '#dc2626' : '#424770',
                '::placeholder': {
                  color: cardError ? '#fca5a5' : '#aab7c4',
                },
              },
            },
            hidePostalCode: false,
          }} 
        />
      </div>

      <button
        type="button"
        onClick={handleStripeSubmit}
        disabled={!stripe || !elements || isProcessing}
        className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700"
      >
        {isProcessing ? 'Bearbetar betalning...' : 'Betala med kort'}
      </button>
    </div>
  );
}
