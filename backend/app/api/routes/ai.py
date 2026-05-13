from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.crud.card import card
from app.crud.deck import deck
from app.models.user import User
from app.schemas.ai import TextToDeckRequest, TextToDeckResponse
from app.services.ai_agent import ai_agent_service

router = APIRouter()


@router.post("/text-to-deck", response_model=TextToDeckResponse)
def generate_deck_from_text(
    request: TextToDeckRequest,
    db: Annotated[Session, Depends(get_db)] = None,
    current_user: Annotated[User, Depends(get_current_user)] = None,
):
    """
    Generate a deck with cards from input text using AI.
    
    The AI will analyze the text and create flashcards covering key concepts.
    """
    if not ai_agent_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="AI service is not available. Configure PROXY_API_KEY or GROQ_API_KEY.",
        )

    try:
        # Generate deck structure from text
        deck_data = ai_agent_service.generate_deck_from_text(
            text=request.text, deck_title=request.deck_title
        )

        # Create deck
        deck_obj = deck.create(
            db,
            obj_in={
                "title": deck_data["title"],
                "description": deck_data.get("description"),
                "user_id": current_user.id,
                "is_public": False,
            },
        )

        # Create cards
        from app.schemas.card import CardCreate
        
        cards_created = 0
        for idx, card_data in enumerate(deck_data["cards"]):
            card.create(
                db,
                obj_in=CardCreate(
                    deck_id=deck_obj.id,
                    front_content=card_data["front_content"],
                    back_content=card_data["back_content"],
                    order_index=idx,
                ),
            )
            cards_created += 1

        db.commit()
        db.refresh(deck_obj)

        return TextToDeckResponse(
            deck_id=deck_obj.id,
            title=deck_obj.title,
            description=deck_obj.description,
            cards_created=cards_created,
            message=f"Successfully created deck '{deck_obj.title}' with {cards_created} cards!",
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate deck: {str(e)}")


@router.get("/status")
def get_ai_status():
    """Check if AI service is available."""
    return {
        "available": ai_agent_service.is_available(),
        "service": "GROQ",
    }
