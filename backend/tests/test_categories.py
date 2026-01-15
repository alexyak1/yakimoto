"""
Tests for category management endpoints.
"""
import pytest


class TestGetCategories:
    """Tests for category retrieval."""
    
    def test_get_all_categories(self, client, test_db_with_data, monkeypatch):
        """Should return all categories."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        response = client.get("/categories")
        
        assert response.status_code == 200
        categories = response.json()
        assert isinstance(categories, list)
        assert len(categories) >= 2  # Gi and Belts from fixture
    
    def test_get_categories_ordered(self, client, test_db_with_data, monkeypatch):
        """Categories should be ordered by display_order."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        response = client.get("/categories")
        
        assert response.status_code == 200
        categories = response.json()
        
        # Verify ordering
        orders = [cat.get("display_order", 0) for cat in categories]
        assert orders == sorted(orders)
    
    def test_get_category_by_name(self, client, test_db_with_data, monkeypatch):
        """Should return single category by name."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        response = client.get("/categories/Gi")
        
        assert response.status_code == 200
        category = response.json()
        assert category["name"] == "Gi"
    
    def test_get_category_not_found(self, client, test_db_with_data, monkeypatch):
        """Should return 404 for non-existent category."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        response = client.get("/categories/NonExistent")
        
        assert response.status_code == 404


class TestCreateCategory:
    """Tests for category creation."""
    
    def test_create_category_requires_auth(self, client, test_db_with_data, monkeypatch):
        """Should require authentication."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        response = client.post("/categories", data={"name": "New Category"})
        
        assert response.status_code == 422  # Missing auth header
    
    def test_create_category_success(self, client, test_db_with_data, auth_headers, monkeypatch):
        """Should create new category with auth."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        response = client.post(
            "/categories",
            data={"name": "New Category"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert response.json()["name"] == "New Category"
        
        # Verify it was created
        response = client.get("/categories/New Category")
        assert response.status_code == 200
    
    def test_create_duplicate_category_updates(self, client, test_db_with_data, auth_headers, monkeypatch):
        """Creating duplicate category should update existing."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        # Create category with same name as existing
        response = client.post(
            "/categories",
            data={"name": "Gi"},
            headers=auth_headers
        )
        
        assert response.status_code == 200


class TestUpdateCategory:
    """Tests for category updates."""
    
    def test_update_category_success(self, client, test_db_with_data, auth_headers, monkeypatch):
        """Should update category name."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        response = client.put(
            "/categories/1",
            data={"name": "Updated Gi"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Gi"
    
    def test_update_category_not_found(self, client, test_db_with_data, auth_headers, monkeypatch):
        """Should return 404 for non-existent category."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        response = client.put(
            "/categories/9999",
            data={"name": "Updated"},
            headers=auth_headers
        )
        
        assert response.status_code == 404


class TestReorderCategories:
    """Tests for category reordering."""
    
    def test_reorder_categories(self, client, test_db_with_data, auth_headers, monkeypatch):
        """Should update category display order."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        # Swap order of categories (id 1 and 2)
        response = client.post(
            "/categories/reorder",
            json={"1": 1, "2": 0},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        
        # Verify order changed
        response = client.get("/categories")
        categories = response.json()
        
        # Belts (id=2) should now come before Gi (id=1)
        category_names = [cat["name"] for cat in categories]
        assert category_names.index("Belts") < category_names.index("Gi")


class TestDeleteCategory:
    """Tests for category deletion."""
    
    def test_delete_category_requires_auth(self, client, test_db_with_data, monkeypatch):
        """Should require authentication."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        response = client.delete("/categories/Gi")
        
        assert response.status_code == 422
    
    def test_delete_category_success(self, client, test_db_with_data, auth_headers, monkeypatch):
        """Should delete category with auth."""
        from app.config import settings
        monkeypatch.setattr(settings, "DB_FILE", test_db_with_data)
        
        response = client.delete("/categories/Gi", headers=auth_headers)
        
        assert response.status_code == 200
        
        # Verify it was deleted
        response = client.get("/categories/Gi")
        assert response.status_code == 404
