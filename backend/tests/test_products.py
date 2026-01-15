"""
Tests for product API endpoints and price calculations.
"""
import io
import json

import pytest


class TestProductPriceCalculations:
    """Tests for product sale price calculation logic."""
    
    def test_calculate_sale_price_with_discount_percent(self):
        """Should calculate sale price from discount percent."""
        from app.routes.products import calculate_sale_price
        
        sale_price, discount = calculate_sale_price(1000, None, "20")
        
        assert sale_price == 800  # 1000 * (1 - 0.20)
        assert discount == 20
    
    def test_calculate_sale_price_explicit_value(self):
        """Should use explicit sale price when no discount."""
        from app.routes.products import calculate_sale_price
        
        sale_price, discount = calculate_sale_price(1000, "750", None)
        
        assert sale_price == 750
        assert discount is None
    
    def test_discount_takes_priority_over_sale_price(self):
        """Discount percent should take priority over explicit sale price."""
        from app.routes.products import calculate_sale_price
        
        sale_price, discount = calculate_sale_price(1000, "750", "30")
        
        assert sale_price == 700  # 1000 * (1 - 0.30), not 750
        assert discount == 30
    
    def test_no_sale_price_no_discount(self):
        """Should return None when no discount or sale price."""
        from app.routes.products import calculate_sale_price
        
        sale_price, discount = calculate_sale_price(1000, None, None)
        
        assert sale_price is None
        assert discount is None
    
    def test_empty_string_values(self):
        """Should handle empty strings as no value."""
        from app.routes.products import calculate_sale_price
        
        sale_price, discount = calculate_sale_price(1000, "", "")
        
        assert sale_price is None
        assert discount is None
    
    def test_invalid_discount_value(self):
        """Should handle invalid discount value gracefully."""
        from app.routes.products import calculate_sale_price
        
        sale_price, discount = calculate_sale_price(1000, None, "invalid")
        
        assert sale_price is None
        assert discount is None
    
    def test_zero_discount(self):
        """Zero discount should result in no sale price."""
        from app.routes.products import calculate_sale_price
        
        sale_price, discount = calculate_sale_price(1000, None, "0")
        
        assert sale_price is None
        assert discount is None


class TestEnsureSalePriceFromDiscount:
    """Tests for ensure_sale_price_from_discount function."""
    
    def test_with_discount_percent(self):
        """Should calculate sale price from discount percent."""
        from app.routes.products import ensure_sale_price_from_discount
        
        product = {"price": 1000, "discount_percent": 25, "sale_price": None}
        result = ensure_sale_price_from_discount(product)
        
        assert result["sale_price"] == 750
    
    def test_with_existing_sale_price_no_discount(self):
        """Should keep valid existing sale price."""
        from app.routes.products import ensure_sale_price_from_discount
        
        product = {"price": 1000, "discount_percent": None, "sale_price": 800}
        result = ensure_sale_price_from_discount(product)
        
        assert result["sale_price"] == 800
    
    def test_sale_price_higher_than_price(self):
        """Should set None if sale price >= price."""
        from app.routes.products import ensure_sale_price_from_discount
        
        product = {"price": 1000, "discount_percent": None, "sale_price": 1200}
        result = ensure_sale_price_from_discount(product)
        
        assert result["sale_price"] is None
    
    def test_discount_results_in_invalid_price(self):
        """Should set None if discount results in 0 or negative price."""
        from app.routes.products import ensure_sale_price_from_discount
        
        product = {"price": 100, "discount_percent": 100, "sale_price": None}
        result = ensure_sale_price_from_discount(product)
        
        assert result["sale_price"] is None


class TestGetProducts:
    """Tests for product retrieval endpoints."""
    
    def test_get_all_products(self, client, test_db_with_data, monkeypatch):
        """Should return all products."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        response = client.get("/products")
        
        assert response.status_code == 200
        products = response.json()
        assert len(products) >= 1
    
    def test_get_product_by_id(self, client, test_db_with_data, monkeypatch):
        """Should return single product by ID."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        response = client.get("/products/1")
        
        assert response.status_code == 200
        product = response.json()
        assert product["id"] == 1
        assert "name" in product
        assert "price" in product
    
    def test_get_product_not_found(self, client, test_db_with_data, monkeypatch):
        """Should return 404 for non-existent product."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        response = client.get("/products/9999")
        
        assert response.status_code == 404
    
    def test_get_products_by_category(self, client, test_db_with_data, monkeypatch):
        """Should return products filtered by category."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        response = client.get("/products/category/Gi")
        
        assert response.status_code == 200
        products = response.json()
        # All returned products should be in Gi category
        for product in products:
            categories = product.get("categories", [])
            category_names = [c["name"] for c in categories]
            assert "Gi" in category_names or product.get("category") == "Gi"


class TestProductResponse:
    """Tests for product response structure."""
    
    def test_product_includes_images(self, client, test_db_with_data, monkeypatch):
        """Product response should include images array."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        response = client.get("/products/1")
        
        assert response.status_code == 200
        product = response.json()
        assert "images" in product
        assert isinstance(product["images"], list)
    
    def test_product_includes_main_image(self, client, test_db_with_data, monkeypatch):
        """Product response should include main_image field."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        response = client.get("/products/1")
        
        assert response.status_code == 200
        product = response.json()
        assert "main_image" in product
    
    def test_product_includes_categories(self, client, test_db_with_data, monkeypatch):
        """Product response should include categories array."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        response = client.get("/products/1")
        
        assert response.status_code == 200
        product = response.json()
        assert "categories" in product
        assert isinstance(product["categories"], list)
    
    def test_product_sizes_normalized(self, client, test_db_with_data, monkeypatch):
        """Product sizes should be in normalized format."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        response = client.get("/products/1")
        
        assert response.status_code == 200
        product = response.json()
        
        if product.get("sizes"):
            sizes = json.loads(product["sizes"])
            for size, value in sizes.items():
                assert isinstance(value, dict)
                assert "online" in value
                assert "club" in value


class TestDeleteProduct:
    """Tests for product deletion."""
    
    def test_delete_product_unauthorized(self, client, test_db_with_data, monkeypatch):
        """Should require authentication to delete product."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        response = client.delete("/products/1")
        
        assert response.status_code == 422  # Missing auth header
    
    def test_delete_product_authorized(self, client, test_db_with_data, auth_headers, monkeypatch):
        """Should delete product with valid auth."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        response = client.delete("/products/1", headers=auth_headers)
        
        assert response.status_code == 200
        assert response.json()["message"] == "Product deleted"
        
        # Verify product is deleted
        response = client.get("/products/1")
        assert response.status_code == 404
