"""CRUD for MentalMap and MentalMapNode."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.mental_map import MentalMap, MentalMapNode
from app.schemas.mental_map import (
    MentalMapCreate,
    MentalMapUpdate,
    MentalMapNodeCreate,
    MentalMapNodeUpdate,
)


class CRUDMentalMap(CRUDBase[MentalMap, MentalMapCreate, MentalMapUpdate]):
    def get_by_user(
        self,
        db: Session,
        user_id: int,
        *,
        skip: int = 0,
        limit: int = 50,
    ) -> list[MentalMap]:
        """Get all mental maps for a user."""
        query = (
            select(MentalMap)
            .where(MentalMap.user_id == user_id)
            .order_by(MentalMap.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(db.scalars(query).all())

    def get_with_nodes(self, db: Session, id: int, user_id: int) -> MentalMap | None:
        """Get a mental map with all nodes, verifying user ownership."""
        stmt = select(MentalMap).where(
            MentalMap.id == id,
            MentalMap.user_id == user_id,
        )
        return db.scalar(stmt)


class CRUDMentalMapNode(CRUDBase[MentalMapNode, MentalMapNodeCreate, MentalMapNodeUpdate]):
    def get_by_map(
        self,
        db: Session,
        map_id: int,
    ) -> list[MentalMapNode]:
        """Get all nodes for a map, ordered by hierarchy and order_index."""
        stmt = (
            select(MentalMapNode)
            .where(MentalMapNode.map_id == map_id)
            .order_by(MentalMapNode.parent_id, MentalMapNode.order_index)
        )
        return list(db.scalars(stmt).all())

    def get_max_order_for_parent(
        self, db: Session, map_id: int, parent_id: int | None
    ) -> int:
        """Get max order_index among siblings."""
        from sqlalchemy import func
        stmt = (
            select(func.coalesce(func.max(MentalMapNode.order_index), -1))
            .where(
                MentalMapNode.map_id == map_id,
                MentalMapNode.parent_id == parent_id,
            )
        )
        return (db.scalar(stmt) or -1) + 1


mental_map = CRUDMentalMap(MentalMap)
mental_map_node = CRUDMentalMapNode(MentalMapNode)
