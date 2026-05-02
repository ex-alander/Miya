"""Mental Map and Node models for the strategic battlefield."""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MentalMap(Base):
    """A user's strategic mental map (campaign map)."""

    __tablename__ = "mental_maps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="Campaign Map")
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped["User"] = relationship("User", back_populates="mental_maps")
    nodes: Mapped[list["MentalMapNode"]] = relationship(
        "MentalMapNode",
        back_populates="map",
        cascade="all, delete-orphan",
        foreign_keys="MentalMapNode.map_id",
    )


class MentalMapNode(Base):
    """A territory node on the mental map. Hierarchical via parent_id."""

    __tablename__ = "mental_map_nodes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    map_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("mental_maps.id", ondelete="CASCADE"), nullable=False, index=True
    )
    parent_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("mental_map_nodes.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="Territory")
    x: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    y: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    mastery_state: Mapped[str] = mapped_column(
        String(20), nullable=False, default="unconquered"
    )  # unconquered | in_progress | mastered
    node_type: Mapped[str] = mapped_column(String(20), nullable=False, default="simple")  # simple | deck
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )  # Optional explanatory text for node popup and study flow
    source_ref: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )  # JSON: document highlight / viewer anchor (temporary feature)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    map: Mapped["MentalMap"] = relationship(
        "MentalMap", back_populates="nodes", foreign_keys=[map_id]
    )
    parent: Mapped["MentalMapNode | None"] = relationship(
        "MentalMapNode",
        remote_side="MentalMapNode.id",
        back_populates="children",
        foreign_keys=[parent_id],
    )
    children: Mapped[list["MentalMapNode"]] = relationship(
        "MentalMapNode",
        back_populates="parent",
        cascade="all, delete-orphan",
        foreign_keys=[parent_id],
        order_by="MentalMapNode.order_index",
    )
    deck: Mapped["Deck | None"] = relationship(
        "Deck",
        back_populates="node",
        uselist=False,
        lazy="joined",
    )

    @property
    def deck_id(self) -> int | None:
        return self.deck.id if self.deck else None
