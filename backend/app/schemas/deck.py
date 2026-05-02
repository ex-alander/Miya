from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class DeckBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Deck title")
    description: str | None = Field(None, max_length=1000, description="Deck description")
    is_public: bool = Field(default=False, description="Whether the deck is publicly visible")
    tags: list[str] | None = Field(default=None, description="Optional list of tags for the deck")

    @field_validator("tags", mode="before")
    @classmethod
    def parse_tags(cls, v: str | list[str] | None) -> list[str] | None:
        if v is None:
            return None
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            return [t.strip() for t in v.split(",") if t.strip()]
        return None


class DeckCreate(DeckBase):
    pass


class DeckUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, max_length=1000)
    is_public: bool | None = None
    tags: list[str] | None = None


class DeckResponse(DeckBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DeckListResponse(BaseModel):
    items: list[DeckResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class DeckStatusResponse(BaseModel):
    next_review: Optional[datetime] = None
    due_count: int
    is_due: bool
    is_mastered: bool
