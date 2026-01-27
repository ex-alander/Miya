from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


class CardBase(BaseModel):
    front_content: str = Field(..., min_length=1, max_length=5000)
    back_content: str = Field(..., min_length=1, max_length=5000)
    ease_factor: float | None = Field(default=None, ge=1.3, le=3.0)
    interval: int | None = Field(default=None, ge=0)
    repetitions: int | None = Field(default=None, ge=0)
    next_review: datetime | None = None
    order_index: int | None = Field(default=None, ge=0)


class CardCreate(CardBase):
    deck_id: int


class CardUpdate(BaseModel):
    front_content: str | None = Field(default=None, min_length=1, max_length=5000)
    back_content: str | None = Field(default=None, min_length=1, max_length=5000)
    ease_factor: float | None = Field(default=None, ge=1.3, le=3.0)
    interval: int | None = Field(default=None, ge=0)
    repetitions: int | None = Field(default=None, ge=0)
    next_review: datetime | None = None
    order_index: int | None = Field(default=None, ge=0)


class CardResponse(CardBase):
    id: int
    deck_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CardListResponse(BaseModel):
    items: list[CardResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class CardBulkCreateItem(BaseModel):
    front_content: str = Field(..., min_length=1, max_length=5000)
    back_content: str = Field(..., min_length=1, max_length=5000)
    order_index: int | None = Field(default=None, ge=0)


class CardBulkCreateRequest(BaseModel):
    deck_id: int
    items: List[CardBulkCreateItem]


class CardBulkUpdateItem(BaseModel):
    id: int
    front_content: str | None = Field(default=None, min_length=1, max_length=5000)
    back_content: str | None = Field(default=None, min_length=1, max_length=5000)
    ease_factor: float | None = Field(default=None, ge=1.3, le=3.0)
    interval: int | None = Field(default=None, ge=0)
    repetitions: int | None = Field(default=None, ge=0)
    next_review: datetime | None = None
    order_index: int | None = Field(default=None, ge=0)


class CardBulkUpdateRequest(BaseModel):
    deck_id: int
    items: List[CardBulkUpdateItem]

