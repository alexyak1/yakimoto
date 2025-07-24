import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ProductList } from './components/ProductList';
import { CartPage } from './components/CartPage';
// import { ProductDetailPage } from './components/ProductDetailPage';
import ProductDetailPage from './components/ProductDetailPage';

import logo from './assets/logo.png';
import AdminPage from './components/AdminPage';
import axios from 'axios';

const CART_KEY = 'yakimoto_cart';

function App() {
  const [cart, setCart] = useState(() => {
    // Load from localStorage on first render
    const storedCart = localStorage.getItem(CART_KEY);
    return storedCart ? JSON.parse(storedCart) : [];
  });

  // Save to localStorage when cart changes
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const [token, setToken] = useState(localStorage.getItem("token") || "");

  const addToCart = (product) => {
    setCart((prev) => [...prev, product]);
  };

  const removeFromCart = (indexToRemove) => {
    setCart((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const updateQuantity = (index, newQty) => {
    const updated = [...cart];
    updated[index].quantity = parseInt(newQty);
    setCart(updated);
  };

  const login = async (password) => {
    try {
      const formData = new FormData();
      formData.append("password", password);
      const res = await axios.post("http://192.168.0.100:8000/login", formData);
      setToken(res.data.token);
      localStorage.setItem("token", res.data.token);
    } catch (err) {
      alert("Login failed");
    }
  };

  const logout = () => {
    setToken("");
    localStorage.removeItem("token");
  };

  return (
    <Router>
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <Link to="/">
          <img src={logo} alt="Yakimoto Shop" className="h-10" />
        </Link>
        <nav className="space-x-4">
          <Link to="/">Produkter</Link>
          <Link to="/cart">🛒 Kundvagn ({cart.length})</Link>
          {token && <button onClick={logout}>Logout</button>}
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<ProductList onAddToCart={addToCart} />} />
        <Route path="/cart" element={<CartPage cart={cart} removeFromCart={removeFromCart} updateQuantity={updateQuantity} />} />
        <Route path="/admin" element={<AdminPage token={token} login={login} />} />
        <Route path="/products/:id" element={<ProductDetailPage onAddToCart={addToCart} />} />
      </Routes>
    </Router>
  );
}

export default App;
