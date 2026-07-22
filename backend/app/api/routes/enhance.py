"""AI enhancement for mental map nodes."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.crud.mental_map import mental_map_node
from app.models.user import User
from app.schemas.mental_map import MentalMapNodeResponse, NodeEnhanceRequest
from app.services.ai_agent import ai_agent_service

router = APIRouter()


def _check_map_access(db: Session, map_id: int, user_id: int) -> None:
    from app.crud.mental_map import mental_map

    m = mental_map.get_with_nodes(db, id=map_id, user_id=user_id)
    if not m:
        raise HTTPException(status_code=404, detail="Map not found")


@router.post(
    "/{map_id}/nodes/{node_id}/enhance",
    response_model=MentalMapNodeResponse,
)
def enhance_node(
    map_id: int,
    node_id: int,
    data: NodeEnhanceRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Improve a node title/description using AI from a user prompt."""
    if not ai_agent_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="AI service is not configured (missing PROXY_API_KEY or GROQ_API_KEY)",
        )

    _check_map_access(db, map_id, current_user.id)
    node = mental_map_node.get(db, id=node_id)
    if not node or node.map_id != map_id:
        raise HTTPException(status_code=404, detail="Node not found")

    try:
        improved = ai_agent_service.enhance_node(
            node.title,
            node.description,
            data.prompt,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    return mental_map_node.update(
        db,
        db_obj=node,
        obj_in={
            "title": improved["title"],
            "description": improved.get("description"),
        },
    )
