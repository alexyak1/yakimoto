import React from 'react';

export const CartPage = ({ cart, removeFromCart }) => {
  const total = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Din kundvagn</h2>
      {cart.length === 0 ? (
        <p>Din kundvagn är tom.</p>
      ) : (
        <div className="space-y-4">
          {cart.map((item, index) => (
            <div key={index} className="flex items-center justify-between bg-white p-4 rounded shadow">
              <div>
                <span className="font-medium">{item.name}</span> - {item.price} SEK
              </div>
              <button
                className="text-red-600 hover:underline"
                onClick={() => removeFromCart(index)}
              >
                Ta bort
              </button>
            </div>
          ))}

          <hr className="my-4" />
          <div className="text-xl font-semibold">Totalt: {total} SEK</div>

          <button
            className="mt-6 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            onClick={() => alert('Fortsätt till betalning kommer snart')}
          >
            Gå till betalning
          </button>
        </div>
      )}
    </div>
  );
};
