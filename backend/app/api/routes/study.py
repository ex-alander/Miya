from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.crud.card import card
from app.crud.user import get_user, update_user
from app.models.user import User
from app.schemas.study import DueCardResponse, ReviewRequest, ReviewResponse, StudySessionResponse, SessionCompleteRequest
from app.services.economy import economy_service
from app.services.sm2 import default_sm2

router = APIRouter()


@router.get("/due", response_model=list[DueCardResponse])
def get_due_cards(
    deck_id: Annotated[int | None, None] = None,
    limit: Annotated[int, None] = 50,
    db: Annotated[Session, Depends(get_db)] = None,
    current_user: Annotated[User, Depends(get_current_user)] = None,
):
    """
    Get cards due for review.
    
    Optionally filter by deck_id. Only returns cards from decks owned by the user.
    """
    from app.models.deck import Deck
    
    # Get due cards
    due_cards = card.get_due_cards(db, deck_id=deck_id, limit=limit)
    
    # Filter to only user's decks
    user_deck_ids = {d.id for d in db.query(Deck).filter(Deck.user_id == current_user.id).all()}
    filtered_cards = [c for c in due_cards if c.deck_id in user_deck_ids]
    
    # Format response
    result = []
    for card_obj in filtered_cards:
        deck_obj = db.get(Deck, card_obj.deck_id)
        if deck_obj:
            result.append(
                DueCardResponse(
                    id=card_obj.id,
                    front_content=card_obj.front_content,
                    back_content=card_obj.back_content,
                    deck_id=card_obj.deck_id,
                    deck_title=deck_obj.title,
                    ease_factor=card_obj.ease_factor,
                    interval=card_obj.interval,
                    repetitions=card_obj.repetitions,
                    next_review=card_obj.next_review,
                )
            )
    
    return result


@router.post("/review", response_model=ReviewResponse)
def submit_review(
    review: ReviewRequest,
    db: Annotated[Session, Depends(get_db)] = None,
    current_user: Annotated[User, Depends(get_current_user)] = None,
):
    """
    Submit a card review and update card parameters using SM-2 algorithm.
    
    Also updates user XP, coins, and streak.
    """
    # Get card
    card_obj = card.get(db, id=review.card_id)
    if not card_obj:
        raise HTTPException(status_code=404, detail="Card not found")
    
    # Verify ownership through deck
    from app.models.deck import Deck
    deck_obj = db.get(Deck, card_obj.deck_id)
    if not deck_obj or deck_obj.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Determine quality rating
    if review.rating:
        quality = default_sm2.get_quality_from_simple_rating(review.rating)
    else:
        quality = review.quality
    
    # Calculate new card parameters using SM-2
    new_ease_factor, new_interval, new_repetitions, next_review = default_sm2.calculate_review(
        quality=quality,
        ease_factor=card_obj.ease_factor,
        interval=card_obj.interval,
        repetitions=card_obj.repetitions,
    )
    
    # Update card
    card_obj.ease_factor = new_ease_factor
    card_obj.interval = new_interval
    card_obj.repetitions = new_repetitions
    card_obj.next_review = next_review
    db.add(card_obj)
    
    # Get active boosts
    from app.services.boosts import boost_service
    boosts = boost_service.get_active_boosts(db, current_user.id)
    
    # Calculate economy rewards
    difficulty = economy_service.get_difficulty_from_ease_factor(card_obj.ease_factor)
    base_xp = economy_service.calculate_xp(
        quality=quality,
        ease_factor=card_obj.ease_factor,
        streak=current_user.daily_streak,
        difficulty=difficulty,
    )
    
    base_coins, new_streak = economy_service.calculate_coins(
        quality=quality,
        current_streak=current_user.daily_streak,
        previous_last_study=current_user.last_study_date,
    )
    # Apply coin boost multiplier
    coins_earned = int(base_coins * boosts["coin_multiplier"])
    
    # Apply XP boost multiplier
    xp_earned = int(base_xp * boosts["xp_multiplier"])
    
    # Update user
    current_user.xp += xp_earned
    current_user.coins += coins_earned
    current_user.daily_streak = new_streak
    current_user.last_study_date = datetime.now()
    db.add(current_user)
    
    db.commit()
    db.refresh(card_obj)
    db.refresh(current_user)
    
    return ReviewResponse(
        card_id=card_obj.id,
        new_ease_factor=new_ease_factor,
        new_interval=new_interval,
        new_repetitions=new_repetitions,
        next_review=next_review,
        xp_earned=xp_earned,
        coins_earned=coins_earned,
        new_streak=new_streak,
    )


@router.post("/session/complete", response_model=StudySessionResponse)
def complete_study_session(
    session_data: SessionCompleteRequest,  # ← Changed to use the model!
    db: Annotated[Session, Depends(get_db)] = None,
    current_user: Annotated[User, Depends(get_current_user)] = None,
):
    """
    Complete a study session and get summary.
    
    This endpoint is mainly for tracking session statistics.
    The actual XP/coins are already awarded during individual reviews.
    """
    return StudySessionResponse(
        total_cards=session_data.total_cards,  # ← Access from session_data
        cards_reviewed=session_data.cards_reviewed,
        total_xp_earned=session_data.total_xp_earned,
        total_coins_earned=session_data.total_coins_earned,
        new_streak=current_user.daily_streak,
        session_duration_seconds=session_data.session_duration_seconds,
    )
