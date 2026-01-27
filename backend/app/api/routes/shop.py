from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.crud.shop import inventory, shop_item
from app.crud.user import get_user, update_user
from app.models.user import User
from app.schemas.shop import InventoryItemResponse, PurchaseRequest, PurchaseResponse, ShopItemResponse

router = APIRouter()


@router.get("/items", response_model=list[ShopItemResponse])
def get_shop_items(
    item_type: Annotated[str | None, None] = None,
    db: Annotated[Session, Depends(get_db)] = None,
):
    """Get all active shop items, optionally filtered by type."""
    if item_type:
        items = shop_item.get_by_type(db, item_type)
    else:
        items = shop_item.get_active(db)
    return items


@router.post("/purchase", response_model=PurchaseResponse)
def purchase_item(
    purchase: PurchaseRequest,
    db: Annotated[Session, Depends(get_db)] = None,
    current_user: Annotated[User, Depends(get_current_user)] = None,
):
    """Purchase a shop item."""
    # Get shop item
    item = shop_item.get(db, id=purchase.shop_item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Shop item not found")
    
    if not item.is_active:
        raise HTTPException(status_code=400, detail="Item is not available")
    
    # Check if user has enough coins
    total_cost = item.price * purchase.quantity
    if current_user.coins < total_cost:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough coins. Need {total_cost}, have {current_user.coins}"
        )
    
    # Deduct coins
    current_user.coins -= total_cost
    db.add(current_user)
    
    # Add to inventory
    inventory.add_item(db, current_user.id, purchase.shop_item_id, purchase.quantity)
    
    db.commit()
    db.refresh(current_user)
    
    return PurchaseResponse(
        success=True,
        message=f"Purchased {purchase.quantity}x {item.name}!",
        coins_remaining=current_user.coins,
        item_name=item.name,
    )


@router.get("/inventory", response_model=list[InventoryItemResponse])
def get_inventory(
    db: Annotated[Session, Depends(get_db)] = None,
    current_user: Annotated[User, Depends(get_current_user)] = None,
):
    """Get user's inventory."""
    items = inventory.get_by_user(db, current_user.id)
    
    # Format response with shop item details
    result = []
    for inv_item in items:
        shop_item_obj = shop_item.get(db, id=inv_item.shop_item_id)
        if shop_item_obj:
            result.append(
                InventoryItemResponse(
                    id=inv_item.id,
                    shop_item_id=inv_item.shop_item_id,
                    shop_item_name=shop_item_obj.name,
                    shop_item_description=shop_item_obj.description,
                    shop_item_icon=shop_item_obj.icon,
                    quantity=inv_item.quantity,
                    purchased_at=inv_item.purchased_at,
                )
            )
    
    return result
