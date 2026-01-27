from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.crud.deck import deck
from app.models.user import User
from app.schemas.deck import DeckCreate, DeckListResponse, DeckResponse, DeckUpdate

router = APIRouter()


@router.post("", response_model=DeckResponse, status_code=201)
def create_deck(
    deck_in: DeckCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Create a new deck."""
    deck_data = deck_in.model_dump()
    deck_data["user_id"] = current_user.id
    deck_obj = deck.create(db, obj_in=deck_data)
    return deck_obj


@router.get("", response_model=DeckListResponse)
def get_decks(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    is_public: Annotated[bool | None, Query()] = None,
    search: Annotated[str | None, Query()] = None,
):
    """Get decks for the current user with pagination and filtering."""
    skip = (page - 1) * page_size
    
    if search:
        items, total = deck.get_by_title_search(
            db,
            search_term=search,
            user_id=current_user.id,
            skip=skip,
            limit=page_size,
        )
    else:
        items, total = deck.get_by_user(
            db,
            user_id=current_user.id,
            skip=skip,
            limit=page_size,
            is_public=is_public,
        )
    
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    
    return DeckListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/public", response_model=DeckListResponse)
def get_public_decks(
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query()] = None,
):
    """Get all public decks."""
    skip = (page - 1) * page_size
    
    if search:
        items, total = deck.get_by_title_search(
            db,
            search_term=search,
            skip=skip,
            limit=page_size,
        )
        # Filter to only public decks
        items = [item for item in items if item.is_public]
        total = len(items)
    else:
        items, total = deck.get_public(db, skip=skip, limit=page_size)
    
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    
    return DeckListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{deck_id}", response_model=DeckResponse)
def get_deck(
    deck_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get a specific deck by ID."""
    deck_obj = deck.get(db, id=deck_id)
    if not deck_obj:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    # Check if user owns the deck or if it's public
    if deck_obj.user_id != current_user.id and not deck_obj.is_public:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return deck_obj


@router.patch("/{deck_id}", response_model=DeckResponse)
def update_deck(
    deck_id: int,
    deck_in: DeckUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Update a deck."""
    deck_obj = deck.get(db, id=deck_id)
    if not deck_obj:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    if deck_obj.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    deck_obj = deck.update(db, db_obj=deck_obj, obj_in=deck_in)
    return deck_obj


@router.delete("/{deck_id}", status_code=204)
def delete_deck(
    deck_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Delete a deck."""
    deck_obj = deck.get(db, id=deck_id)
    if not deck_obj:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    if deck_obj.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    deck.delete(db, id=deck_id)
    return None
