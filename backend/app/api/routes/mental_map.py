"""API routes for Mental Maps (Battlefield)."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.crud.mental_map import mental_map, mental_map_node
from app.models.deck import Deck
from app.models.mental_map import MentalMapNode
from app.models.user import User
from app.services.ai_agent import ai_agent_service
from app.services.mental_map_layout import compute_node_positions
from app.schemas.mental_map import (
    MentalMapCreate,
    MentalMapResponse,
    MentalMapUpdate,
    MentalMapWithNodesResponse,
    MentalMapNodeCreate,
    MentalMapNodeResponse,
    MentalMapNodeUpdate,
    MentalMapImportPayload,
    MentalMapGenerateFromTextRequest,
)

router = APIRouter()


@router.post("", response_model=MentalMapResponse, status_code=201)
def create_map(
    data: MentalMapCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Create a new mental map."""
    obj = mental_map.create(db, obj_in={**data.model_dump(), "user_id": current_user.id})
    return obj


@router.get("", response_model=list[MentalMapResponse])
def list_maps(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """List all mental maps for the current user."""
    return mental_map.get_by_user(db, user_id=current_user.id)


@router.get("/tree", response_model=list[MentalMapWithNodesResponse])
def list_maps_with_nodes(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """List all mental maps with nodes for sidebar tree view."""
    maps_list = mental_map.get_by_user(db, user_id=current_user.id)
    return [mental_map.get_with_nodes(db, id=m.id, user_id=current_user.id) for m in maps_list]


@router.post("/import", response_model=MentalMapWithNodesResponse, status_code=201)
def import_map(
    data: MentalMapImportPayload,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Bulk-create a map and nodes from a .map JSON payload (temporary interchange)."""
    temp_ids = {n.temp_id for n in data.nodes}
    if len(temp_ids) != len(data.nodes):
        raise HTTPException(status_code=400, detail="Duplicate temp_id in import nodes")

    for n in data.nodes:
        if n.parent_temp_id is not None and n.parent_temp_id not in temp_ids:
            raise HTTPException(
                status_code=400,
                detail=f"parent_temp_id {n.parent_temp_id} not found for node temp_id {n.temp_id}",
            )

    m = mental_map.create(
        db,
        obj_in={"title": data.title, "user_id": current_user.id},
    )

    id_map: dict[int, int] = {}
    by_temp = {n.temp_id: n for n in data.nodes}
    remaining = set(by_temp)

    while remaining:
        layer = [
            tid
            for tid in remaining
            if (by_temp[tid].parent_temp_id is None or by_temp[tid].parent_temp_id in id_map)
        ]
        if not layer:
            raise HTTPException(status_code=400, detail="Invalid parent references or cycle in import")

        for tid in layer:
            node = by_temp[tid]
            parent_db_id = id_map.get(node.parent_temp_id) if node.parent_temp_id else None

            db_node = MentalMapNode(
                map_id=m.id,
                parent_id=parent_db_id,
                title=node.title,
                description=node.description,
                x=node.x,
                y=node.y,
                order_index=node.order_index,
                mastery_state=node.mastery_state,
                node_type=node.node_type,
                source_ref=node.source_ref,
            )
            db.add(db_node)
            db.commit()
            db.refresh(db_node)
            id_map[node.temp_id] = db_node.id

            if node.node_type == "deck":
                deck = Deck(
                    title=db_node.title,
                    user_id=current_user.id,
                    node_id=db_node.id,
                )
                db.add(deck)
                db.commit()

            remaining.discard(tid)

    result = mental_map.get_with_nodes(db, id=m.id, user_id=current_user.id)
    if not result:
        raise HTTPException(status_code=500, detail="Import failed")
    return result


@router.post("/generate-from-text", response_model=MentalMapWithNodesResponse, status_code=201)
def generate_map_from_text(
    data: MentalMapGenerateFromTextRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Create a mental map from document text using the LLM (Fire Nation / Miya AI)."""
    if not ai_agent_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="AI service is not configured (missing PROXY_API_KEY or GROQ_API_KEY)",
        )
    try:
        ai = ai_agent_service.generate_mental_map_from_text(data.text, data.title)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    nodes_raw = ai["nodes"]
    n = len(nodes_raw)
    parent_of: list[int | None] = []
    for i, item in enumerate(nodes_raw):
        pi = item.get("parent_index")
        if pi is None:
            parent_of.append(None)
            continue
        try:
            p = int(pi) - 1
        except (TypeError, ValueError):
            parent_of.append(None)
            continue
        if p < 0 or p >= n or p == i or p >= i:
            parent_of.append(None)
        else:
            parent_of.append(p)

    positions = compute_node_positions(parent_of)
    map_title = str(ai.get("map_title") or data.title or "Карта знаний")[:200]

    m = mental_map.create(
        db,
        obj_in={"title": map_title, "user_id": current_user.id},
    )

    id_map: dict[int, int] = {}
    for i in range(n):
        p_idx = parent_of[i]
        parent_db_id = id_map[p_idx] if p_idx is not None else None
        x, y = positions[i]
        db_node = MentalMapNode(
            map_id=m.id,
            parent_id=parent_db_id,
            title=str(nodes_raw[i]["title"])[:200],
            description=str(nodes_raw[i].get("description") or "").strip()[:4000] or None,
            x=float(x),
            y=float(y),
            order_index=i,
            mastery_state="unconquered",
            node_type="simple",
            source_ref=None,
        )
        db.add(db_node)
        db.commit()
        db.refresh(db_node)
        id_map[i] = db_node.id

    result = mental_map.get_with_nodes(db, id=m.id, user_id=current_user.id)
    if not result:
        raise HTTPException(status_code=500, detail="Generation failed")
    return result


@router.get("/{map_id}", response_model=MentalMapWithNodesResponse)
def get_map_with_nodes(
    map_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get a mental map with all its nodes."""
    m = mental_map.get_with_nodes(db, id=map_id, user_id=current_user.id)
    if not m:
        raise HTTPException(status_code=404, detail="Map not found")
    return m


@router.patch("/{map_id}", response_model=MentalMapResponse)
def update_map(
    map_id: int,
    data: MentalMapUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Update a mental map."""
    m = mental_map.get_with_nodes(db, id=map_id, user_id=current_user.id)
    if not m:
        raise HTTPException(status_code=404, detail="Map not found")
    return mental_map.update(db, db_obj=m, obj_in=data)


@router.delete("/{map_id}", status_code=204)
def delete_map(
    map_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Delete a mental map and all its nodes."""
    m = mental_map.get_with_nodes(db, id=map_id, user_id=current_user.id)
    if not m:
        raise HTTPException(status_code=404, detail="Map not found")
    mental_map.delete(db, id=map_id)
    return None


# --- Nodes ---


def _check_map_access(db: Session, map_id: int, user_id: int):
    m = mental_map.get_with_nodes(db, id=map_id, user_id=user_id)
    if not m:
        raise HTTPException(status_code=404, detail="Map not found")
    return m


@router.post("/{map_id}/nodes", response_model=MentalMapNodeResponse, status_code=201)
def create_node(
    map_id: int,
    data: MentalMapNodeCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Create a node on the map. If type=deck, also creates a linked Deck."""
    _check_map_access(db, map_id, current_user.id)
    order = mental_map_node.get_max_order_for_parent(
        db, map_id=map_id, parent_id=data.parent_id
    )
    dump = data.model_dump()
    obj = mental_map_node.create(
        db,
        obj_in={
            **dump,
            "map_id": map_id,
            "order_index": order,
        },
    )
    if obj.node_type == "deck":
        deck = Deck(
            title=obj.title,
            user_id=current_user.id,
            node_id=obj.id,
        )
        db.add(deck)
        db.commit()
        db.refresh(deck)
    return obj


def _is_descendant(db: Session, node_id: int, ancestor_id: int) -> bool:
    """Check if ancestor_id is in the ancestor chain of node_id."""
    n = mental_map_node.get(db, id=node_id)
    while n and n.parent_id:
        if n.parent_id == ancestor_id:
            return True
        n = mental_map_node.get(db, id=n.parent_id)
    return False


@router.patch("/{map_id}/nodes/{node_id}", response_model=MentalMapNodeResponse)
def update_node(
    map_id: int,
    node_id: int,
    data: MentalMapNodeUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Update a node (position, title, parent, mastery state)."""
    _check_map_access(db, map_id, current_user.id)
    node = mental_map_node.get(db, id=node_id)
    if not node or node.map_id != map_id:
        raise HTTPException(status_code=404, detail="Node not found")
    # Prevent cycles: cannot set parent to a descendant of self
    if data.parent_id is not None:
        if _is_descendant(db, data.parent_id, node_id):
            raise HTTPException(
                status_code=400,
                detail="Cannot attach: would create a cycle (target is descendant of source)",
            )
    return mental_map_node.update(db, db_obj=node, obj_in=data)


@router.delete("/{map_id}/nodes/{node_id}", status_code=204)
def delete_node(
    map_id: int,
    node_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Delete a node. Children are orphaned (parent_id set to null) or cascaded per schema."""
    _check_map_access(db, map_id, current_user.id)
    node = mental_map_node.get(db, id=node_id)
    if not node or node.map_id != map_id:
        raise HTTPException(status_code=404, detail="Node not found")
    mental_map_node.delete(db, id=node_id)
    return None
