"""Schemas for Mental Map and Node."""

from datetime import datetime

from pydantic import BaseModel, Field


class MentalMapNodeBase(BaseModel):
    title: str = Field(default="Territory", max_length=200)
    description: str | None = Field(
        default=None,
        max_length=4000,
        description="Optional short explanation shown in node popup and branch study",
    )
    x: float = Field(default=0.0, description="X position on battlefield")
    y: float = Field(default=0.0, description="Y position on battlefield")
    parent_id: int | None = None
    order_index: int = Field(default=0, ge=0)
    mastery_state: str = Field(
        default="unconquered",
        pattern="^(unconquered|in_progress|mastered)$",
    )
    node_type: str = Field(default="simple", pattern="^(simple|deck)$")
    source_ref: str | None = Field(
        default=None,
        max_length=16000,
        description="JSON string: document source anchor for the node",
    )


class MentalMapNodeCreate(MentalMapNodeBase):
    pass


class MentalMapNodeUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    description: str | None = Field(None, max_length=4000)
    x: float | None = None
    y: float | None = None
    parent_id: int | None = None
    order_index: int | None = Field(None, ge=0)
    mastery_state: str | None = Field(
        None,
        pattern="^(unconquered|in_progress|mastered)$",
    )
    node_type: str | None = Field(None, pattern="^(simple|deck)$")
    source_ref: str | None = Field(None, max_length=16000)


class MentalMapNodeResponse(MentalMapNodeBase):
    id: int
    map_id: int
    deck_id: int | None = None  # Set when node_type=deck
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MentalMapBase(BaseModel):
    title: str = Field(default="Campaign Map", max_length=200)


class MentalMapCreate(MentalMapBase):
    pass


class MentalMapUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)


class MentalMapResponse(MentalMapBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MentalMapWithNodesResponse(MentalMapResponse):
    nodes: list[MentalMapNodeResponse] = []

    model_config = {"from_attributes": True}


class MentalMapImportNode(BaseModel):
    """Node definition for bulk import (.map file). Uses temp ids for parent links."""

    temp_id: int = Field(..., ge=1)
    parent_temp_id: int | None = Field(default=None)
    title: str = Field(..., max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    x: float = 0.0
    y: float = 0.0
    order_index: int = Field(default=0, ge=0)
    mastery_state: str = Field(
        default="unconquered",
        pattern="^(unconquered|in_progress|mastered)$",
    )
    node_type: str = Field(default="simple", pattern="^(simple|deck)$")
    source_ref: str | None = Field(default=None, max_length=16000)


class MentalMapImportPayload(BaseModel):
    title: str = Field(default="Imported Map", max_length=200)
    nodes: list[MentalMapImportNode] = Field(default_factory=list)


class MentalMapGenerateFromTextRequest(BaseModel):
    """Plain text extracted from PDF/DOCX/MD on the client."""

    text: str = Field(..., min_length=20, max_length=5000_000)
    title: str | None = Field(None, max_length=200)


class NodeEnhanceRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
