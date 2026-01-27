from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.card import Card
from app.schemas.card import CardCreate, CardUpdate


class CRUDCard(CRUDBase[Card, CardCreate, CardUpdate]):
    def get_by_deck(
        self,
        db: Session,
        deck_id: int,
        *,
        skip: int = 0,
        limit: int = 100,
        search: str | None = None,
    ) -> tuple[list[Card], int]:
        query = select(Card).where(Card.deck_id == deck_id).order_by(Card.order_index, Card.id)
        count_query = select(func.count()).select_from(Card).where(Card.deck_id == deck_id)

        if search:
            like_term = f"%{search}%"
            query = query.where(Card.front_content.ilike(like_term) | Card.back_content.ilike(like_term))
            count_query = count_query.where(Card.front_content.ilike(like_term) | Card.back_content.ilike(like_term))

        total = db.scalar(count_query) or 0
        items = db.scalars(query.offset(skip).limit(limit)).all()
        return list(items), total

    def create_bulk(self, db: Session, *, deck_id: int, items: list[CardCreate | dict]) -> list[Card]:
        card_objects: list[Card] = []
        for idx, item in enumerate(items):
            data = item if isinstance(item, dict) else item.model_dump(exclude_unset=True)
            card_objects.append(
                Card(
                    deck_id=deck_id,
                    front_content=data["front_content"],
                    back_content=data["back_content"],
                    order_index=data.get("order_index", idx),
                    ease_factor=data.get("ease_factor", 2.5),
                    interval=data.get("interval", 0),
                    repetitions=data.get("repetitions", 0),
                    next_review=data.get("next_review"),
                )
            )
        db.add_all(card_objects)
        db.commit()
        for card in card_objects:
            db.refresh(card)
        return card_objects

    def update_bulk(
        self,
        db: Session,
        *,
        deck_id: int,
        items: list[dict],
    ) -> list[Card]:
        ids = [item["id"] for item in items if "id" in item]
        if not ids:
            return []

        query = select(Card).where(Card.deck_id == deck_id, Card.id.in_(ids))
        existing = {card.id: card for card in db.scalars(query).all()}

        updated: list[Card] = []
        for item in items:
            card_id = item.get("id")
            card = existing.get(card_id)
            if not card:
                continue
            for field, value in item.items():
                if field == "id":
                    continue
                if value is not None and hasattr(card, field):
                    setattr(card, field, value)
            updated.append(card)

        if updated:
            db.add_all(updated)
            db.commit()
            for c in updated:
                db.refresh(c)
        return updated

    def get_due_cards(
        self,
        db: Session,
        deck_id: int | None = None,
        *,
        limit: int = 50,
    ) -> list[Card]:
        """Get cards that are due for review."""
        from app.models.deck import Deck
        
        query = select(Card).join(Deck).where(Card.next_review <= datetime.now())
        
        if deck_id is not None:
            query = query.where(Card.deck_id == deck_id)
        
        query = query.order_by(Card.next_review.asc()).limit(limit)
        
        return list(db.scalars(query).all())


card = CRUDCard(Card)
