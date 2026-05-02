from __future__ import annotations

from datetime import datetime
from typing import List, Literal

from pydantic import BaseModel, Field


class MiyaDeckMeta(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    is_public: bool = False
    tags: list[str] | None = None


class MiyaCard(BaseModel):
    front_content: str = Field(..., min_length=1, max_length=5000)
    back_content: str = Field(..., min_length=1, max_length=5000)
    tags: list[str] | None = None
    hint: str | None = Field(default=None, max_length=2000)


class MiyaDeckPayload(BaseModel):
    deck: MiyaDeckMeta
    cards: list[MiyaCard]


class ImportCardPreview(BaseModel):
    temp_id: int
    front_content: str
    back_content: str
    tags: list[str] | None = None
    hint: str | None = None
    is_duplicate: bool = False
    selected: bool = True


class ImportDeckPreview(BaseModel):
    source_name: str
    deck: MiyaDeckMeta
    cards: list[ImportCardPreview]
    total_cards: int
    duplicate_cards: int


class ImportPreviewResponse(BaseModel):
    items: list[ImportDeckPreview]
    total_decks: int
    total_cards: int
    total_duplicates: int


class ImportApplyDeck(BaseModel):
    deck: MiyaDeckMeta
    cards: list[ImportCardPreview]
    conflict_mode: Literal["create_new", "merge_into_existing"] = "create_new"
    existing_deck_id: int | None = None


class ImportApplyRequest(BaseModel):
    decks: list[ImportApplyDeck]


class ImportApplyResult(BaseModel):
    deck_id: int
    imported_cards: int
    skipped_duplicates: int


class ImportApplyResponse(BaseModel):
    results: list[ImportApplyResult]


class ImportExportHistoryItem(BaseModel):
    id: int
    deck_id: int | None
    action: Literal["import", "export"]
    format: str
    total_cards: int | None
    details: str | None
    created_at: datetime


class ImportExportHistoryResponse(BaseModel):
    items: List[ImportExportHistoryItem]

