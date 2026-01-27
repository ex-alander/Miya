from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.crud.achievement import achievement
from app.models.user import User
from app.schemas.achievement import AchievementResponse

router = APIRouter()


@router.get("/", response_model=list[AchievementResponse])
def get_achievements(
    db: Annotated[Session, Depends(get_db)] = None,
    current_user: Annotated[User, Depends(get_current_user)] = None,
):
    """Get all achievements with unlock status for current user."""
    achievements = achievement.get_by_user(db, current_user.id)
    
    # Get unlocked achievement IDs
    from app.models.achievement import UserAchievement
    from sqlalchemy import select
    
    unlocked_ids = {
        ua.achievement_id
        for ua in db.scalars(
            select(UserAchievement).where(UserAchievement.user_id == current_user.id)
        ).all()
    }
    
    result = []
    for ach in achievements:
        result.append(
            AchievementResponse(
                id=ach.id,
                name=ach.name,
                description=ach.description,
                icon=ach.icon,
                xp_required=ach.xp_required,
                is_secret=ach.is_secret,
                is_active=ach.is_active,
                created_at=ach.created_at,
                unlocked=ach.id in unlocked_ids,
                unlocked_at=None,  # Could be enhanced to include unlock date
            )
        )
    
    return result
