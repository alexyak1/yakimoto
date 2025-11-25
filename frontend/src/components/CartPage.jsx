import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { checkout } from '../api';
import { useNavigate } from 'react-router-dom';
import { updatePageMeta } from '../seo.jsx';
import { SmartImage } from './SmartImage';

export const CartPage = ({ cart, removeFromCart, updateQuantity }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // Customer input states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [payment, setPayment] = useState('swish');

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Update page meta tags and canonical URL
  useEffect(() => {
    updatePageMeta(
      "Kundvagn - Yakimoto Dojo | Judo Gi & Judo Dräkt",
      "Din kundvagn på Yakimoto Dojo. Högkvalitativ judo utrustning för Alingsås Judoklubb.",
      "https://yakimoto.se/cart"
    );
  }, []);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Kundvagnen är tom.');
      return;
    }

    if (!firstName || !lastName || !email || !phone) {
      alert('Fyll i alla kunduppgifter.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          size: item.selectedSize,
          quantity: item.quantity,
          price: item.price,
        })),
        total,
        customer: {
          firstName,
          lastName,
          email,
          phone,
        },
        payment,
      };

      await checkout(payload);
      setMessage('✅ Ordern är lagd!');
    } catch (err) {
      console.error('Checkout error:', err);
      setMessage('❌ Något gick fel vid beställning.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h2 className="text-3xl font-bold mb-6">Kundvagn</h2>

      {cart.length === 0 ? (
        <p className="text-gray-500">Din kundvagn är tom.</p>
      ) : (
        <div className="space-y-6">
          {cart.map((item, index) => (
            <div
              key={index}
              className="flex items-start justify-between border-b pb-6"
            >
              <SmartImage
                src={item.images?.[0]}
                alt={item.name}
                className="w-28 h-28 object-cover rounded"
                loading="lazy"
              />

              <div className="flex-1 px-4">
                <h3 className="text-lg font-semibold">{item.name}</h3>
                <p className="text-sm text-gray-600">Produktbeskrivning</p>
                <p className="text-sm text-gray-700 mt-1">
                  Vadderad • {item.selectedSize} • Standard
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <select
                    value={item.quantity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val > item.available) {
                        alert(`Endast ${item.available} i lager för storlek ${item.selectedSize}`);
                        return;
                      }
                      updateQuantity(index, val);
                    }}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    {[...Array(item.available || 1).keys()].map(i => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeFromCart(index)}
                    className="text-gray-500 hover:text-red-600"
                    title="Ta bort"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="text-right font-semibold">
                {item.price * item.quantity} kr
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center pt-8 border-t mt-4">
            <div className="text-xl font-semibold">Totalt</div>
            <div className="text-2xl font-bold">{total} kr</div>
          </div>


          <div className="text-right mt-6">
            <button
              className="bg-black text-white px-6 py-3 rounded-full hover:bg-gray-900 transition"
              onClick={() => navigate('/checkout')}
            >
              Gå till betalning
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
