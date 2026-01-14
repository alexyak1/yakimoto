"""
Inventory management service.
"""
import json
from typing import Dict, Any, List

from ..database import get_db


def normalize_sizes(sizes_dict: Dict) -> Dict:
    """
    Normalize sizes to new format with location support.
    
    Converts old format {"170": 5} to new format {"170": {"online": 5, "club": 0}}
    
    Args:
        sizes_dict: Size quantities in any format
        
    Returns:
        Normalized sizes dictionary
    """
    if not sizes_dict:
        return {}
    
    normalized = {}
    for size, value in sizes_dict.items():
        if isinstance(value, dict):
            if "online" in value or "club" in value:
                # Already in new location-based format
                normalized[size] = {
                    "online": int(value.get("online", 0)) if value.get("online") else 0,
                    "club": int(value.get("club", 0)) if value.get("club") else 0
                }
            elif "quantity" in value:
                # Old intermediate format
                location = value.get("location", "online")
                normalized[size] = {
                    "online": int(value.get("quantity", 0)) if location == "online" else 0,
                    "club": int(value.get("quantity", 0)) if location == "club" else 0
                }
            else:
                normalized[size] = {
                    "online": int(value.get("online", 0)) if value.get("online") else 0,
                    "club": int(value.get("club", 0)) if value.get("club") else 0
                }
        else:
            # Old format (just a number)
            normalized[size] = {
                "online": int(value) if value else 0,
                "club": 0
            }
    return normalized


def get_size_quantity(sizes_dict: Dict, size: str) -> int:
    """Get total quantity for a size across all locations."""
    if not sizes_dict or size not in sizes_dict:
        return 0
    
    value = sizes_dict[size]
    if isinstance(value, dict):
        if "online" in value or "club" in value:
            return int(value.get("online", 0)) + int(value.get("club", 0))
        elif "quantity" in value:
            return int(value.get("quantity", 0))
        return 0
    return int(value) if value else 0


def get_size_quantity_by_location(sizes_dict: Dict, size: str, location: str) -> int:
    if not sizes_dict or size not in sizes_dict:
        return 0
    
    value = sizes_dict[size]
    if isinstance(value, dict):
        if "online" in value or "club" in value:
            return int(value.get(location, 0))
        elif "quantity" in value and value.get("location") == location:
            return int(value.get("quantity", 0))
        return 0
    return int(value) if value and location == "online" else 0


def update_size_quantity(sizes_dict: Dict, size: str, quantity: int, location: str = "online") -> Dict:
    """Update quantity for a size at a specific location."""
    if not sizes_dict:
        sizes_dict = {}
    
    if size not in sizes_dict:
        sizes_dict[size] = {"online": 0, "club": 0}
    else:
        sizes_dict[size] = normalize_sizes({size: sizes_dict[size]})[size]
    
    sizes_dict[size][location] = max(0, quantity)
    return sizes_dict


class InventoryService:
    """Service for managing product inventory."""
    
    @staticmethod
    def reduce_stock(items: List[Dict[str, Any]]) -> None:
        """
        Reduce stock levels after an order.
        
        Deducts from online stock first, then club stock if needed.
        
        Args:
            items: List of order items with id, selectedSize, quantity
        """
        conn = get_db()
        cursor = conn.cursor()
        
        for item in items:
            product_id = item["id"]
            size = str(item["selectedSize"])
            quantity = int(item["quantity"])
            
            cursor.execute("SELECT sizes FROM products WHERE id = ?", (product_id,))
            row = cursor.fetchone()
            if not row:
                continue
            
            sizes = json.loads(row["sizes"])
            sizes = normalize_sizes(sizes)
            
            if size in sizes:
                remaining = quantity
                online_qty = sizes[size].get("online", 0)
                club_qty = sizes[size].get("club", 0)
                
                # Reduce from online first
                if online_qty >= remaining:
                    sizes[size]["online"] = online_qty - remaining
                    remaining = 0
                else:
                    sizes[size]["online"] = 0
                    remaining -= online_qty
                
                # Then reduce from club if needed
                if remaining > 0:
                    sizes[size]["club"] = max(0, club_qty - remaining)
            
            updated_sizes = json.dumps(sizes)
            cursor.execute(
                "UPDATE products SET sizes = ? WHERE id = ?",
                (updated_sizes, product_id)
            )
        
        conn.commit()
        conn.close()
