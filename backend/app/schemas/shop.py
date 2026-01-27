from datetime import datetime

from pydantic import BaseModel, Field


class ShopItemBase(BaseModel):
    name: str = Field(..., max_length=200)
    description: str
    price: int = Field(..., ge=0)
    item_type: str = Field(..., description="Type: boost, cosmetic, unlock")
    effect_data: str | None = None
    icon: str | None = None


class ShopItemCreate(ShopItemBase):
    pass


class ShopItemResponse(ShopItemBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PurchaseRequest(BaseModel):
    shop_item_id: int
    quantity: int = Field(default=1, ge=1, le=10)


class PurchaseResponse(BaseModel):
    success: bool
    message: str
    coins_remaining: int
    item_name: str


class InventoryItemResponse(BaseModel):
    id: int
    shop_item_id: int
    shop_item_name: str
    shop_item_description: str
    shop_item_icon: str | None
    quantity: int
    purchased_at: datetime

    class Config:
        from_attributes = True
