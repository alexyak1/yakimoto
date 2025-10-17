import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ProductList } from './components/ProductList';
import { CartPage } from './components/CartPage';
import ProductDetailPage from './components/ProductDetailPage';
import Checkout from './components/Checkout';
import { Toaster } from 'react-hot-toast';

import logo from './assets/logo.png';
import AdminPage from './components/AdminPage';
import TimePage from './components/TimePage';
import axios from 'axios';
import { initGA, trackPageView, trackAddToCart, trackRemoveFromCart, trackBeginCheckout } from './analytics';

const CART_KEY = 'yakimoto_cart';
const API_URL = import.meta.env.VITE_API_URL;

// Component to track page views and normalize URLs
function PageTracker() {
  const location = useLocation();

  useEffect(() => {
    // Normalize the current URL to prevent duplicate content issues
    const currentUrl = window.location.href;
    const normalizedUrl = currentUrl.split('?')[0].replace(/\/$/, '');
    
    // If the URL has parameters or trailing slash, redirect to clean version
    if (currentUrl !== normalizedUrl && !currentUrl.includes('#')) {
      window.history.replaceState({}, '', normalizedUrl);
    }
    
    trackPageView(location.pathname + location.search);
  }, [location]);

  return null;
}

// Component to conditionally render header
function ConditionalHeader({ cart, token, logout }) {
  const location = useLocation();
  
  // Don't render header on time page
  if (location.pathname === '/time') {
    return null;
  }
  
  return (
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
  );
}

axios.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem("token");
      window.location.href = "/admin";
    }
    return Promise.reject(err);
  }
);

function App() {
  const [cart, setCart] = useState(() => {
    const storedCart = localStorage.getItem(CART_KEY);
    return storedCart ? JSON.parse(storedCart) : [];
  });

  // Initialize Google Analytics
  useEffect(() => {
    initGA();
  }, []);

  // Save to localStorage when cart changes
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const [token, setToken] = useState(localStorage.getItem("token") || "");

  const addToCart = (product) => {
    const exists = cart.find(
      item => item.id === product.id && item.selectedSize === product.selectedSize
    );

    if (exists) return false;

    setCart((prev) => [...prev, product]);
    
    // Track add to cart event
    trackAddToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: product.quantity || 1,
      category: product.category || 'Product'
    });
    
    return true;
  };

  const removeFromCart = (indexToRemove) => {
    const itemToRemove = cart[indexToRemove];
    setCart((prev) => prev.filter((_, index) => index !== indexToRemove));
    
    // Track remove from cart event
    if (itemToRemove) {
      trackRemoveFromCart({
        id: itemToRemove.id,
        name: itemToRemove.name,
        price: itemToRemove.price,
        quantity: itemToRemove.quantity || 1,
        category: itemToRemove.category || 'Product'
      });
    }
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
      const res = await axios.post(`${API_URL}/login`, formData);
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
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            marginTop: '4rem',
          },
        }}
      />
      <Router>
        <PageTracker />
        <ConditionalHeader cart={cart} token={token} logout={logout} />

        <Routes>
          <Route path="/" element={<ProductList onAddToCart={addToCart} />} />
          <Route path="/cart" element={<CartPage cart={cart} removeFromCart={removeFromCart} updateQuantity={updateQuantity} />} />
          <Route path="/admin" element={<AdminPage token={token} login={login} />} />
          <Route path="/products/:id" element={<ProductDetailPage onAddToCart={addToCart} />} />
          <Route path="/checkout" element={<Checkout cart={cart} setCart={setCart} />} />
          <Route path="/time" element={<TimePage />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
