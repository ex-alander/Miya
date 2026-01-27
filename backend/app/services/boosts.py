"""
Service for handling shop item boosts (XP Boost, Coin Magnet, etc.)
"""
import json
from typing import Optional

from sqlalchemy.orm import Session

from app.models.shop_item import ShopItem, UserInventory


class BoostService:
    """Service for managing active boosts from shop items."""

    def get_active_boosts(self, db: Session, user_id: int) -> dict:
        """
        Get active boosts for a user from their inventory.
        
        Returns a dict with multipliers and other boost effects.
        """
        boosts = {
            "xp_multiplier": 1.0,
            "coin_multiplier": 1.0,
            "streak_freeze": False,
        }

        from sqlalchemy import select
        
        # Get user's inventory items with boost type
        inventory_items = db.scalars(
            select(UserInventory)
            .join(ShopItem, UserInventory.shop_item_id == ShopItem.id)
            .where(
                UserInventory.user_id == user_id,
                ShopItem.item_type == "boost",
                ShopItem.is_active == True,
            )
        ).all()

        for inv_item in inventory_items:
            shop_item = db.get(ShopItem, inv_item.shop_item_id)
            if not shop_item or not shop_item.effect_data:
                continue

            try:
                effect_data = json.loads(shop_item.effect_data)
                
                # Apply XP multiplier
                if "xp_multiplier" in effect_data:
                    boosts["xp_multiplier"] *= effect_data["xp_multiplier"]
                
                # Apply coin multiplier
                if "coin_multiplier" in effect_data:
                    boosts["coin_multiplier"] *= effect_data["coin_multiplier"]
                
                # Apply streak freeze
                if "streak_freeze" in effect_data and effect_data["streak_freeze"]:
                    boosts["streak_freeze"] = True

            except (json.JSONDecodeError, KeyError):
                continue

        return boosts

    def consume_boost(self, db: Session, user_id: int, shop_item_id: int) -> bool:
        """
        Consume one use of a boost item (for single-use boosts).
        Currently boosts are permanent until manually removed.
        """
        inventory_item = db.scalar(
            db.query(UserInventory).where(
                UserInventory.user_id == user_id,
                UserInventory.shop_item_id == shop_item_id,
            )
        )

        if not inventory_item or inventory_item.quantity <= 0:
            return False

        # For now, boosts don't consume - they're permanent
        # In the future, we could implement single-use boosts here
        return True


boost_service = BoostService()
