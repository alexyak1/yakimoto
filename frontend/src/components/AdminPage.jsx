import React, { useState, useEffect } from "react";
import axios from "axios";

function AdminPage({ token, login }) {
    const [products, setProducts] = useState([]);
    const [name, setName] = useState("");
    const [price, setPrice] = useState(0);
    const [quantity, setQuantity] = useState(0);
    const [image, setImage] = useState(null);
    const [password, setPassword] = useState("");
    const [editProductId, setEditProductId] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", price: "", quantity: 0 });

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        const res = await axios.get("http://localhost:8000/products");
        setProducts(res.data);
    };

    const handleCreate = async () => {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("price", price);
        formData.append("quantity", parseInt(quantity || "0", 10));
        formData.append("image", image);

        await axios.post("http://localhost:8000/products", formData, {
            headers: { Authorization: `Bearer ${token}` },
        });

        setName("");
        setPrice("");
        setQuantity("");
        setImage(null);
        fetchProducts();
    };

    const deleteProduct = async (id) => {
        await axios.delete(`http://localhost:8000/products/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        fetchProducts();
    };

    const startEdit = (product) => {
        setEditProductId(product.id);
        setEditForm({
            name: product.name,
            price: product.price,
            quantity: product.quantity,
        });
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm((prev) => ({ ...prev, [name]: value }));
    };

    const submitEdit = async (id) => {
        const formData = new FormData();
        formData.append("name", editForm.name);
        formData.append("price", editForm.price);
        formData.append("quantity", parseInt(editForm.quantity || "0", 10));

        await axios.put(`http://localhost:8000/products/${id}`, formData, {
            headers: { Authorization: `Bearer ${token}` },
        });

        setEditProductId(null);
        fetchProducts();
    };

    if (!token) {
        return (
            <div className="p-4">
                <h2 className="text-lg font-semibold mb-2">Admin Login</h2>
                <input
                    type="password"
                    placeholder="Lösenord"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border p-1 mr-2"
                />
                <button
                    onClick={() => login(password)}
                    className="bg-blue-500 text-white px-3 py-1"
                >
                    Logga in
                </button>
            </div>
        );
    }

    return (
        <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Admin Panel</h2>

            <div className="mb-6">
                <h3 className="font-semibold mb-2">Lägg till ny produkt</h3>
                <input
                    type="text"
                    placeholder="Namn"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border p-1 mr-2"
                />
                <input
                    type="number"
                    placeholder="Pris"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="border p-1 mr-2"
                />
                <input
                    type="number"
                    placeholder="Antal i lager"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="border p-1 mr-2"
                />
                <input
                    type="file"
                    onChange={(e) => setImage(e.target.files[0])}
                    className="border p-1 mr-2"
                />
                <button onClick={handleCreate} className="bg-green-600 text-white px-3 py-1">
                    Skapa produkt
                </button>
            </div>

            <div>
                <h3 className="font-semibold mb-2">Befintliga produkter</h3>
                {products.map((product) => (
                    <div key={product.id} className="border p-2 mb-2">
                        {editProductId === product.id ? (
                            <div>
                                <input
                                    name="name"
                                    value={editForm.name}
                                    onChange={handleEditChange}
                                    className="border p-1 mr-2"
                                />
                                <input
                                    name="price"
                                    value={editForm.price}
                                    onChange={handleEditChange}
                                    className="border p-1 mr-2"
                                />
                                <input
                                    name="quantity"
                                    value={editForm.quantity}
                                    onChange={handleEditChange}
                                    className="border p-1 mr-2"
                                />
                                <button onClick={() => submitEdit(product.id)} className="bg-blue-600 text-white px-2 py-1 mr-1">Spara</button>
                                <button onClick={() => setEditProductId(null)} className="bg-gray-400 text-white px-2 py-1">Avbryt</button>
                            </div>
                        ) : (
                            <div>
                                <p>{product.name} – {product.price} SEK – I lager: {product.quantity}</p>
                                <button onClick={() => startEdit(product)} className="bg-yellow-500 text-white px-2 py-1 mr-1">Redigera</button>
                                <button onClick={() => deleteProduct(product.id)} className="bg-red-600 text-white px-2 py-1">Ta bort</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default AdminPage;
