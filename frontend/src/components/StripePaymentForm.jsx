// StripePaymentForm.jsx
import React, { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { toast } from 'react-hot-toast';
import api from '../api';

export default function StripePaymentForm({ cart, setCart, formData, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStripeSubmit = async () => {
    console.log('Stripe form submitted!');
    console.log('Stripe ready:', !!stripe);
    console.log('Elements ready:', !!elements);

    if (!stripe || !elements) {
      toast.error('Stripe är inte redo än. Försök igen om en stund.');
      return;
    }

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
        toast.error(error.message || 'Betalning misslyckades.');
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        await api.post('/confirm-payment', {
          payment_intent_id: paymentIntent.id,
          order: orderData,
        });

        toast.success('Betalning genomförd!');
        setCart([]);
        localStorage.removeItem('yakimoto_cart');
        onSuccess?.();
      }
    } catch (err) {
      console.error('Stripe payment error:', err);
      toast.error('Något gick fel vid betalning. Försök igen.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
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
