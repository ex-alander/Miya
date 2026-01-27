from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.shop_item import ShopItem, UserInventory
from app.schemas.shop import ShopItemCreate


class CRUDShopItem(CRUDBase[ShopItem, ShopItemCreate, ShopItemCreate]):
    def get_active(self, db: Session) -> list[ShopItem]:
        """Get all active shop items."""
        query = select(ShopItem).where(ShopItem.is_active == True)
        return list(db.scalars(query).all())

    def get_by_type(self, db: Session, item_type: str) -> list[ShopItem]:
        """Get shop items by type."""
        query = select(ShopItem).where(
            ShopItem.is_active == True,
            ShopItem.item_type == item_type
        )
        return list(db.scalars(query).all())


class CRUDInventory(CRUDBase[UserInventory, dict, dict]):
    def get_by_user(self, db: Session, user_id: int) -> list[UserInventory]:
        """Get all inventory items for a user."""
        query = select(UserInventory).where(UserInventory.user_id == user_id)
        return list(db.scalars(query).all())

    def get_item(self, db: Session, user_id: int, shop_item_id: int) -> UserInventory | None:
        """Get a specific inventory item."""
        query = select(UserInventory).where(
            UserInventory.user_id == user_id,
            UserInventory.shop_item_id == shop_item_id
        )
        return db.scalar(query)

    def add_item(
        self,
        db: Session,
        user_id: int,
        shop_item_id: int,
        quantity: int = 1
    ) -> UserInventory:
        """Add or update inventory item."""
        existing = self.get_item(db, user_id, shop_item_id)
        if existing:
            existing.quantity += quantity
            db.add(existing)
            db.commit()
            db.refresh(existing)
            return existing
        else:
            new_item = UserInventory(
                user_id=user_id,
                shop_item_id=shop_item_id,
                quantity=quantity
            )
            db.add(new_item)
            db.commit()
            db.refresh(new_item)
            return new_item


shop_item = CRUDShopItem(ShopItem)
inventory = CRUDInventory(UserInventory)
