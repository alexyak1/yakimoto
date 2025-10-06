// Checkout.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../api';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import StripePaymentForm from './StripePaymentForm';
import { trackBeginCheckout } from '../analytics';
import { updatePageMeta } from '../seo.jsx';

export default function Checkout({ cart, setCart }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    deliveryMethod: 'pickup', // Default to pickup
  });

  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stripePublishableKey, setStripePublishableKey] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Only create the Stripe promise when a key exists
  const stripePromise = useMemo(() => {
    if (!stripePublishableKey) return null;
    return loadStripe(stripePublishableKey, {
      locale: 'sv' // Set Swedish locale
    });
  }, [stripePublishableKey]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((data) => ({ ...data, [name]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleValidationError = (errors) => {
    setValidationErrors(errors);
  };


  // Update page meta tags and canonical URL
  useEffect(() => {
    updatePageMeta(
      "Kassa - Yakimoto Dojo | Judo Gi & Judo Dräkt",
      "Slutför din beställning på Yakimoto Dojo. Högkvalitativ judo utrustning för Alingsås Judoklubb.",
      "https://yakimoto.se/checkout"
    );
  }, []);

  // Load Stripe publishable key when there's something in the cart
  useEffect(() => {
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
      
      // Track begin checkout event
      const totalValue = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const items = cart.map(item => ({
        item_id: item.id,
        item_name: item.name,
        item_category: item.category || 'Product',
        quantity: item.quantity,
        price: item.price,
      }));
      
      trackBeginCheckout(totalValue, items);
    }
  }, [cart]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (cart.length === 0) {
      toast.error('Din kundvagn är tom.');
      setIsSubmitting(false);
      return;
    }

    // Stripe payment is handled by StripePaymentForm component
    toast.error('För betalning, använd kortformuläret nedan.');
    setIsSubmitting(false);
    return;

    const orderData = {
      customer: formData,
      items: cart,
      createdAt: new Date().toISOString(),
    };

    try {
      await api.post('/checkout', orderData);
      toast.success('Beställning skickad!');
      setCart([]);
      localStorage.removeItem('yakimoto_cart');
      setSuccess(true);
    } catch (err) {
      console.error(err);
      toast.error('Något gick fel. Försök igen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {success ? (
        <div className="max-w-lg mx-auto p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Tack för din beställning!</h2>
          <p className="text-gray-700">Vi kommer att kontakta dig inom kort via e-post eller telefon.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto p-4">
          <h2 className="text-2xl font-bold mb-4">Slutför beställning</h2>

           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">
               Förnamn *
             </label>
             <input
               required
               placeholder="Förnamn"
               name="firstName"
               value={formData.firstName}
               onChange={handleChange}
               className={`w-full border px-4 py-2 rounded focus:outline-none focus:ring-2 ${
                 validationErrors.firstName 
                   ? 'border-red-500 bg-red-50 focus:ring-red-500' 
                   : 'border-gray-300 focus:ring-blue-500'
               }`}
             />
           </div>
           
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">
               Efternamn *
             </label>
             <input
               required
               placeholder="Efternamn"
               name="lastName"
               value={formData.lastName}
               onChange={handleChange}
               className={`w-full border px-4 py-2 rounded focus:outline-none focus:ring-2 ${
                 validationErrors.lastName 
                   ? 'border-red-500 bg-red-50 focus:ring-red-500' 
                   : 'border-gray-300 focus:ring-blue-500'
               }`}
             />
           </div>
           
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">
               E-post *
             </label>
             <input
               required
               type="email"
               placeholder="E-post"
               name="email"
               value={formData.email}
               onChange={handleChange}
               className={`w-full border px-4 py-2 rounded focus:outline-none focus:ring-2 ${
                 validationErrors.email 
                   ? 'border-red-500 bg-red-50 focus:ring-red-500' 
                   : 'border-gray-300 focus:ring-blue-500'
               }`}
             />
           </div>
           
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">
               Telefonnummer *
             </label>
             <input
               required
               type="tel"
               placeholder="Telefonnummer"
               name="phone"
               value={formData.phone}
               onChange={handleChange}
               className={`w-full border px-4 py-2 rounded focus:outline-none focus:ring-2 ${
                 validationErrors.phone 
                   ? 'border-red-500 bg-red-50 focus:ring-red-500' 
                   : 'border-gray-300 focus:ring-blue-500'
               }`}
             />
           </div>

           {/* Delivery method selection */}
           <div>
             <h3 className="font-semibold mb-2">Leveransmetod</h3>
             <div className="space-y-2">
               <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
                 <input
                   type="radio"
                   name="deliveryMethod"
                   value="pickup"
                   checked={formData.deliveryMethod === 'pickup'}
                   onChange={handleChange}
                   className="mr-3"
                 />
                 <div>
                   <div className="font-medium">Hämta i Alingsås Judoklubb</div>
                   <div className="text-sm text-gray-600">Gratis</div>
                 </div>
               </label>
               
               <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
                 <input
                   type="radio"
                   name="deliveryMethod"
                   value="postnord"
                   checked={formData.deliveryMethod === 'postnord'}
                   onChange={handleChange}
                   className="mr-3"
                 />
                 <div>
                   <div className="font-medium">PostNord leverans</div>
                   <div className="text-sm text-gray-600">+82 SEK</div>
                 </div>
               </label>
             </div>
           </div>

           {/* Order total display */}
           <div className="p-4 border rounded bg-gray-50">
             <h3 className="font-semibold mb-2">Ordersammanfattning</h3>
             <div className="space-y-1">
               <div className="flex justify-between">
                 <span>Produkter:</span>
                 <span>{cart.reduce((sum, item) => sum + item.price * item.quantity, 0)} SEK</span>
               </div>
               <div className="flex justify-between">
                 <span>Leverans:</span>
                 <span>{formData.deliveryMethod === 'postnord' ? '82 SEK' : 'Gratis'}</span>
               </div>
               <div className="flex justify-between font-bold text-lg border-t pt-2">
                 <span>Totalt:</span>
                 <span>{cart.reduce((sum, item) => sum + item.price * item.quantity, 0) + (formData.deliveryMethod === 'postnord' ? 82 : 0)} SEK</span>
               </div>
             </div>
           </div>

           {/* Stripe payment section */}
           <div>
             <h3 className="font-semibold mb-2">Betalning med kort</h3>
             
             {!stripePromise ? (
               <div className="p-4 border rounded bg-gray-50">
                 <h3 className="font-semibold mb-2">Kortuppgifter</h3>
                 <p className="text-gray-600">Laddar Stripe…</p>
               </div>
             ) : (
                     <Elements stripe={stripePromise}>
                       <StripePaymentForm
                         cart={cart}
                         setCart={setCart}
                         formData={formData}
                         onSuccess={() => setSuccess(true)}
                         onValidationError={handleValidationError}
                       />
                     </Elements>
             )}
           </div>

        </form>
      )}
    </>
  );
}
