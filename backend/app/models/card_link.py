"""Card links for graph view relationships."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CardLink(Base):
    __tablename__ = "card_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    from_card_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False, index=True
    )
    to_card_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False, index=True
    )
    relation_type: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    from_card: Mapped["Card"] = relationship("Card", foreign_keys=[from_card_id])
    to_card: Mapped["Card"] = relationship("Card", foreign_keys=[to_card_id])
