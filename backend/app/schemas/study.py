from datetime import datetime

from pydantic import BaseModel, Field


class ReviewRequest(BaseModel):
    """Request schema for submitting a card review."""

    card_id: int = Field(..., description="ID of the card being reviewed")
    quality: int = Field(..., ge=0, le=5, description="Quality rating (0-5)")
    rating: str | None = Field(
        None,
        description="Simple rating (again/hard/good/easy). If provided, overrides quality.",
    )


class ReviewResponse(BaseModel):
    """Response schema for a card review."""

    card_id: int
    new_ease_factor: float
    new_interval: int
    new_repetitions: int
    next_review: datetime
    xp_earned: int
    coins_earned: int
    new_streak: int


class StudySessionResponse(BaseModel):
    """Response schema for study session summary."""

    total_cards: int
    cards_reviewed: int
    total_xp_earned: int
    total_coins_earned: int
    new_streak: int
    session_duration_seconds: int


class DueCardResponse(BaseModel):
    """Response schema for a card due for review."""

    id: int
    front_content: str
    back_content: str
    deck_id: int
    deck_title: str
    ease_factor: float
    interval: int
    repetitions: int
    next_review: datetime

class SessionCompleteRequest(BaseModel):
    """Request schema for completing a study session."""
    
    total_cards: int = Field(..., ge=0, description="Total cards in the session")
    cards_reviewed: int = Field(..., ge=0, description="Number of cards reviewed")
    total_xp_earned: int = Field(..., ge=0, description="Total XP earned in session")
    total_coins_earned: int = Field(..., ge=0, description="Total coins earned in session")
    session_duration_seconds: int = Field(..., ge=0, description="Duration of session in seconds")