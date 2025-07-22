import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ProductList } from './components/ProductList';
import { CartPage } from './components/CartPage';
import logo from './assets/logo.png';
import AdminPage from './components/AdminPage';
import axios from 'axios';

function App() {
  const [cart, setCart] = useState([]);
  const [token, setToken] = useState(localStorage.getItem("token") || "");

  const addToCart = (product) => {
    setCart((prev) => [...prev, product]);
  };

  const removeFromCart = (indexToRemove) => {
    setCart((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const login = async (password) => {
    try {
      const formData = new FormData();
      formData.append("password", password);
      const res = await axios.post("http://localhost:8000/login", formData);
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
        <img src={logo} alt="Yakimoto Shop" className="h-10" />
        <nav className="space-x-4">
          <Link to="/">Produkter</Link>
          <Link to="/cart">🛒 Kundvagn ({cart.length})</Link>
          {token && <button onClick={logout}>Logout</button>}
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<ProductList onAddToCart={addToCart} />} />
        <Route path="/cart" element={<CartPage cart={cart} removeFromCart={removeFromCart} />} />
        <Route path="/admin" element={<AdminPage token={token} login={login} />} />
      </Routes>
    </Router>
  );
}

export default App;
