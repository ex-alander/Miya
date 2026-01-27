from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.crud.card import card
from app.crud.deck import deck
from app.models.user import User
from app.schemas.card import (
    CardBulkCreateRequest,
    CardBulkUpdateRequest,
    CardCreate,
    CardListResponse,
    CardResponse,
    CardUpdate,
)

router = APIRouter()


def _ensure_deck_owned(db: Session, deck_id: int, user: User):
    deck_obj = deck.get(db, id=deck_id)
    if not deck_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")
    if deck_obj.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    return deck_obj


def _ensure_card_owned(db: Session, card_id: int, user: User):
    card_obj = card.get(db, id=card_id)
    if not card_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    _ensure_deck_owned(db, card_obj.deck_id, user)
    return card_obj


@router.get("", response_model=CardListResponse)
def list_cards(
    deck_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=200)] = 50,
    search: Annotated[str | None, Query()] = None,
):
    _ensure_deck_owned(db, deck_id, current_user)
    skip = (page - 1) * page_size
    items, total = card.get_by_deck(db, deck_id=deck_id, skip=skip, limit=page_size, search=search)
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    return CardListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=CardResponse, status_code=status.HTTP_201_CREATED)
def create_card(
    card_in: CardCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    _ensure_deck_owned(db, card_in.deck_id, current_user)
    return card.create(db, obj_in=card_in)


@router.post("/bulk", response_model=list[CardResponse], status_code=status.HTTP_201_CREATED)
def create_cards_bulk(
    bulk_in: CardBulkCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    _ensure_deck_owned(db, bulk_in.deck_id, current_user)
    return card.create_bulk(db, deck_id=bulk_in.deck_id, items=bulk_in.items)


@router.patch("/bulk", response_model=list[CardResponse])
def update_cards_bulk(
    bulk_in: CardBulkUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    _ensure_deck_owned(db, bulk_in.deck_id, current_user)
    updated = card.update_bulk(db, deck_id=bulk_in.deck_id, items=[item.model_dump(exclude_unset=True) for item in bulk_in.items])
    return updated


@router.patch("/{card_id}", response_model=CardResponse)
def update_card(
    card_id: int,
    card_in: CardUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    card_obj = _ensure_card_owned(db, card_id, current_user)
    return card.update(db, db_obj=card_obj, obj_in=card_in)


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(
    card_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    _ensure_card_owned(db, card_id, current_user)
    card.delete(db, id=card_id)
    return None
