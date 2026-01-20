"""
Tests for inventory service - critical business logic for stock management.
"""
import json
import sqlite3

import pytest

from app.services.inventory import (
    normalize_sizes,
    get_size_quantity,
    get_size_quantity_by_location,
    update_size_quantity,
    move_between_locations,
    InventoryService,
)


class TestNormalizeSizes:
    """Tests for the normalize_sizes function."""
    
    def test_normalize_empty_dict(self):
        """Empty dict should return empty dict."""
        result = normalize_sizes({})
        assert result == {}
    
    def test_normalize_none(self):
        """None should return empty dict."""
        result = normalize_sizes(None)
        assert result == {}
    
    def test_normalize_old_format_simple_numbers(self):
        """Old format with simple numbers should convert to location format."""
        sizes = {"170": 5, "180": 3}
        result = normalize_sizes(sizes)
        
        assert result == {
            "170": {"online": 5, "club": 0},
            "180": {"online": 3, "club": 0}
        }
    
    def test_normalize_already_normalized(self):
        """Already normalized format should stay the same."""
        sizes = {
            "170": {"online": 5, "club": 2},
            "180": {"online": 3, "club": 1}
        }
        result = normalize_sizes(sizes)
        
        assert result == sizes
    
    def test_normalize_mixed_format(self):
        """Mixed format should normalize all entries."""
        sizes = {
            "170": 5,  # Old format
            "180": {"online": 3, "club": 1},  # New format
        }
        result = normalize_sizes(sizes)
        
        assert result == {
            "170": {"online": 5, "club": 0},
            "180": {"online": 3, "club": 1}
        }
    
    def test_normalize_intermediate_format_with_quantity(self):
        """Intermediate format with quantity field should convert correctly."""
        sizes = {
            "170": {"quantity": 5, "location": "online"},
            "180": {"quantity": 3, "location": "club"}
        }
        result = normalize_sizes(sizes)
        
        assert result == {
            "170": {"online": 5, "club": 0},
            "180": {"online": 0, "club": 3}
        }
    
    def test_normalize_with_zero_values(self):
        """Zero values should be preserved."""
        sizes = {"170": 0, "180": {"online": 0, "club": 0}}
        result = normalize_sizes(sizes)
        
        assert result == {
            "170": {"online": 0, "club": 0},
            "180": {"online": 0, "club": 0}
        }
    
    def test_normalize_with_none_values(self):
        """None values should become 0."""
        sizes = {"170": None}
        result = normalize_sizes(sizes)
        
        assert result == {"170": {"online": 0, "club": 0}}
    
    def test_normalize_partial_location_format(self):
        """Partial location format should fill missing with 0."""
        sizes = {
            "170": {"online": 5},  # Missing club
            "180": {"club": 3}     # Missing online
        }
        result = normalize_sizes(sizes)
        
        assert result == {
            "170": {"online": 5, "club": 0},
            "180": {"online": 0, "club": 3}
        }


class TestGetSizeQuantity:
    """Tests for get_size_quantity function."""
    
    def test_get_quantity_from_normalized(self):
        """Should return total quantity from normalized format."""
        sizes = {"170": {"online": 5, "club": 2}}
        result = get_size_quantity(sizes, "170")
        assert result == 7
    
    def test_get_quantity_from_old_format(self):
        """Should return quantity from old simple format."""
        sizes = {"170": 5}
        result = get_size_quantity(sizes, "170")
        assert result == 5
    
    def test_get_quantity_from_intermediate_format(self):
        """Should return quantity from intermediate format."""
        sizes = {"170": {"quantity": 5}}
        result = get_size_quantity(sizes, "170")
        assert result == 5
    
    def test_get_quantity_missing_size(self):
        """Should return 0 for missing size."""
        sizes = {"170": {"online": 5, "club": 2}}
        result = get_size_quantity(sizes, "190")
        assert result == 0
    
    def test_get_quantity_empty_dict(self):
        """Should return 0 for empty dict."""
        result = get_size_quantity({}, "170")
        assert result == 0
    
    def test_get_quantity_none(self):
        """Should return 0 for None."""
        result = get_size_quantity(None, "170")
        assert result == 0


class TestGetSizeQuantityByLocation:
    """Tests for get_size_quantity_by_location function."""
    
    def test_get_online_quantity(self):
        """Should return online quantity only."""
        sizes = {"170": {"online": 5, "club": 2}}
        result = get_size_quantity_by_location(sizes, "170", "online")
        assert result == 5
    
    def test_get_club_quantity(self):
        """Should return club quantity only."""
        sizes = {"170": {"online": 5, "club": 2}}
        result = get_size_quantity_by_location(sizes, "170", "club")
        assert result == 2
    
    def test_old_format_online_location(self):
        """Old format should return value for online location."""
        sizes = {"170": 5}
        result = get_size_quantity_by_location(sizes, "170", "online")
        assert result == 5
    
    def test_old_format_club_location(self):
        """Old format should return 0 for club location."""
        sizes = {"170": 5}
        result = get_size_quantity_by_location(sizes, "170", "club")
        assert result == 0
    
    def test_missing_size(self):
        """Should return 0 for missing size."""
        sizes = {"170": {"online": 5, "club": 2}}
        result = get_size_quantity_by_location(sizes, "190", "online")
        assert result == 0


class TestUpdateSizeQuantity:
    """Tests for update_size_quantity function."""
    
    def test_update_existing_size(self):
        """Should update quantity for existing size."""
        sizes = {"170": {"online": 5, "club": 2}}
        result = update_size_quantity(sizes, "170", 10, "online")
        
        assert result["170"]["online"] == 10
        assert result["170"]["club"] == 2
    
    def test_update_club_location(self):
        """Should update club quantity."""
        sizes = {"170": {"online": 5, "club": 2}}
        result = update_size_quantity(sizes, "170", 8, "club")
        
        assert result["170"]["online"] == 5
        assert result["170"]["club"] == 8
    
    def test_add_new_size(self):
        """Should add new size with correct structure."""
        sizes = {"170": {"online": 5, "club": 2}}
        result = update_size_quantity(sizes, "180", 3, "online")
        
        assert result["180"]["online"] == 3
        assert result["180"]["club"] == 0
    
    def test_update_from_empty_dict(self):
        """Should create entry from empty dict."""
        result = update_size_quantity({}, "170", 5, "online")
        
        assert result["170"]["online"] == 5
        assert result["170"]["club"] == 0
    
    def test_update_from_none(self):
        """Should create entry from None."""
        result = update_size_quantity(None, "170", 5, "online")
        
        assert result["170"]["online"] == 5
        assert result["170"]["club"] == 0
    
    def test_negative_quantity_clamped_to_zero(self):
        """Negative quantity should be clamped to 0."""
        sizes = {"170": {"online": 5, "club": 2}}
        result = update_size_quantity(sizes, "170", -5, "online")
        
        assert result["170"]["online"] == 0


class TestMoveBetweenLocations:
    """Tests for move_between_locations function."""
    
    def test_move_from_online_to_club(self):
        """Should move inventory from online to club."""
        sizes = {"170": {"online": 5, "club": 2}}
        result = move_between_locations(sizes, "170", 3, "online", "club")
        
        assert result["170"]["online"] == 2  # 5 - 3 = 2
        assert result["170"]["club"] == 5     # 2 + 3 = 5
    
    def test_move_from_club_to_online(self):
        """Should move inventory from club to online."""
        sizes = {"170": {"online": 2, "club": 5}}
        result = move_between_locations(sizes, "170", 3, "club", "online")
        
        assert result["170"]["online"] == 5  # 2 + 3 = 5
        assert result["170"]["club"] == 2     # 5 - 3 = 2
    
    def test_move_all_from_location(self):
        """Should allow moving all stock from a location."""
        sizes = {"170": {"online": 3, "club": 0}}
        result = move_between_locations(sizes, "170", 3, "online", "club")
        
        assert result["170"]["online"] == 0
        assert result["170"]["club"] == 3
    
    def test_move_insufficient_stock_raises_error(self):
        """Should raise error when insufficient stock at source."""
        sizes = {"170": {"online": 2, "club": 1}}
        
        with pytest.raises(ValueError) as exc_info:
            move_between_locations(sizes, "170", 5, "online", "club")
        
        assert "Insufficient stock" in str(exc_info.value)
    
    def test_move_nonexistent_size_raises_error(self):
        """Should raise error for nonexistent size."""
        sizes = {"170": {"online": 5, "club": 2}}
        
        with pytest.raises(ValueError) as exc_info:
            move_between_locations(sizes, "180", 1, "online", "club")
        
        assert "not found" in str(exc_info.value)
    
    def test_move_normalizes_old_format(self):
        """Should normalize old format before moving."""
        sizes = {"170": 5}  # Old format
        result = move_between_locations(sizes, "170", 2, "online", "club")
        
        assert result["170"]["online"] == 3  # 5 - 2 = 3
        assert result["170"]["club"] == 2     # 0 + 2 = 2


class TestInventoryServiceReduceStock:
    """Tests for InventoryService.reduce_stock - critical for order processing."""
    
    @pytest.fixture
    def db_with_product(self, test_db):
        """Create a database with a product for stock reduction tests."""
        conn = sqlite3.connect(test_db)
        conn.row_factory = sqlite3.Row
        
        sizes = json.dumps({"170": {"online": 5, "club": 2}, "180": {"online": 3, "club": 0}})
        conn.execute(
            "INSERT INTO products (id, name, price, sizes) VALUES (?, ?, ?, ?)",
            (1, "Test Gi", 1000, sizes)
        )
        conn.commit()
        conn.close()
        
        return test_db
    
    def test_reduce_stock_online_only(self, db_with_product, monkeypatch):
        """Should reduce online stock when sufficient."""
        from app import database
        monkeypatch.setattr(database.settings, "DB_FILE", db_with_product)
        
        items = [{"id": 1, "selectedSize": "170", "quantity": 3}]
        InventoryService.reduce_stock(items)
        
        # Verify stock was reduced
        conn = sqlite3.connect(db_with_product)
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT sizes FROM products WHERE id = 1").fetchone()
        conn.close()
        
        sizes = json.loads(row["sizes"])
        assert sizes["170"]["online"] == 2  # 5 - 3 = 2
        assert sizes["170"]["club"] == 2    # Unchanged
    
    def test_reduce_stock_overflow_to_club(self, db_with_product, monkeypatch):
        """Should overflow to club stock when online insufficient."""
        from app import database
        monkeypatch.setattr(database.settings, "DB_FILE", db_with_product)
        
        items = [{"id": 1, "selectedSize": "170", "quantity": 6}]
        InventoryService.reduce_stock(items)
        
        conn = sqlite3.connect(db_with_product)
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT sizes FROM products WHERE id = 1").fetchone()
        conn.close()
        
        sizes = json.loads(row["sizes"])
        assert sizes["170"]["online"] == 0  # All online consumed
        assert sizes["170"]["club"] == 1    # 2 - 1 (overflow) = 1
    
    def test_reduce_stock_multiple_items(self, db_with_product, monkeypatch):
        """Should reduce stock for multiple items in order."""
        from app import database
        monkeypatch.setattr(database.settings, "DB_FILE", db_with_product)
        
        items = [
            {"id": 1, "selectedSize": "170", "quantity": 2},
            {"id": 1, "selectedSize": "180", "quantity": 1}
        ]
        InventoryService.reduce_stock(items)
        
        conn = sqlite3.connect(db_with_product)
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT sizes FROM products WHERE id = 1").fetchone()
        conn.close()
        
        sizes = json.loads(row["sizes"])
        assert sizes["170"]["online"] == 3  # 5 - 2 = 3
        assert sizes["180"]["online"] == 2  # 3 - 1 = 2
    
    def test_reduce_stock_nonexistent_product(self, db_with_product, monkeypatch):
        """Should handle nonexistent product gracefully."""
        from app import database
        monkeypatch.setattr(database.settings, "DB_FILE", db_with_product)
        
        items = [{"id": 999, "selectedSize": "170", "quantity": 1}]
        # Should not raise exception
        InventoryService.reduce_stock(items)
    
    def test_reduce_stock_nonexistent_size(self, db_with_product, monkeypatch):
        """Should handle nonexistent size gracefully."""
        from app import database
        monkeypatch.setattr(database.settings, "DB_FILE", db_with_product)
        
        items = [{"id": 1, "selectedSize": "999", "quantity": 1}]
        # Should not raise exception
        InventoryService.reduce_stock(items)
        
        # Verify existing sizes unchanged
        conn = sqlite3.connect(db_with_product)
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT sizes FROM products WHERE id = 1").fetchone()
        conn.close()
        
        sizes = json.loads(row["sizes"])
        assert sizes["170"]["online"] == 5  # Unchanged
