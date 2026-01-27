from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.deck import Deck
from app.schemas.deck import DeckCreate, DeckUpdate


class CRUDDeck(CRUDBase[Deck, DeckCreate, DeckUpdate]):
    def get_by_user(
        self,
        db: Session,
        user_id: int,
        *,
        skip: int = 0,
        limit: int = 100,
        is_public: bool | None = None,
    ) -> tuple[list[Deck], int]:
        """Get decks for a specific user with optional public filter."""
        query = select(Deck).where(Deck.user_id == user_id)
        
        if is_public is not None:
            query = query.where(Deck.is_public == is_public)
        
        # Get total count
        count_query = select(func.count()).select_from(Deck).where(Deck.user_id == user_id)
        if is_public is not None:
            count_query = count_query.where(Deck.is_public == is_public)
        total = db.scalar(count_query) or 0
        
        # Apply pagination
        items = db.scalars(query.offset(skip).limit(limit)).all()
        return list(items), total

    def get_public(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[Deck], int]:
        """Get all public decks."""
        return self.get_multi(
            db,
            skip=skip,
            limit=limit,
            filters={"is_public": True},
        )

    def get_by_title_search(
        self,
        db: Session,
        search_term: str,
        *,
        user_id: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[Deck], int]:
        """Search decks by title."""
        query = select(Deck).where(Deck.title.ilike(f"%{search_term}%"))
        
        if user_id is not None:
            query = query.where(Deck.user_id == user_id)
        
        # Get total count
        count_query = select(func.count()).select_from(Deck)
        if user_id is not None:
            count_query = count_query.where(Deck.user_id == user_id)
        count_query = count_query.where(Deck.title.ilike(f"%{search_term}%"))
        total = db.scalar(count_query) or 0
        
        # Apply pagination
        items = db.scalars(query.offset(skip).limit(limit)).all()
        return list(items), total


deck = CRUDDeck(Deck)
