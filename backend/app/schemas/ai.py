from typing import Any

from pydantic import BaseModel, Field


class TextToDeckRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=50000, description="Input text to generate deck from")
    deck_title: str | None = Field(None, max_length=200, description="Optional title for the deck")


class TextToDeckResponse(BaseModel):
    deck_id: int
    title: str
    description: str | None
    cards_created: int
    message: str
