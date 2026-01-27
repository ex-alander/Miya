from datetime import datetime

from pydantic import BaseModel, Field


class DeckBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Deck title")
    description: str | None = Field(None, max_length=1000, description="Deck description")
    is_public: bool = Field(default=False, description="Whether the deck is publicly visible")


class DeckCreate(DeckBase):
    pass


class DeckUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, max_length=1000)
    is_public: bool | None = None


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
