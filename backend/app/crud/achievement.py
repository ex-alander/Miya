from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.achievement import Achievement, UserAchievement


class CRUDAchievement(CRUDBase[Achievement, dict, dict]):
    def get_all(self, db: Session) -> list[Achievement]:
        """Get all active achievements."""
        query = select(Achievement).where(Achievement.is_active == True)
        return list(db.scalars(query).all())

    def get_by_user(self, db: Session, user_id: int) -> list[Achievement]:
        """Get all achievements with unlock status for a user."""
        achievements = self.get_all(db)
        unlocked_ids = {
            ua.achievement_id
            for ua in db.scalars(
                select(UserAchievement).where(UserAchievement.user_id == user_id)
            ).all()
        }
        
        # Mark achievements as unlocked
        for achievement in achievements:
            achievement.unlocked = achievement.id in unlocked_ids
        
        return achievements


class CRUDUserAchievement(CRUDBase[UserAchievement, dict, dict]):
    def unlock(self, db: Session, user_id: int, achievement_id: int) -> UserAchievement:
        """Unlock an achievement for a user."""
        # Check if already unlocked
        existing = db.scalar(
            select(UserAchievement).where(
                UserAchievement.user_id == user_id,
                UserAchievement.achievement_id == achievement_id
            )
        )
        if existing:
            return existing
        
        new_unlock = UserAchievement(
            user_id=user_id,
            achievement_id=achievement_id
        )
        db.add(new_unlock)
        db.commit()
        db.refresh(new_unlock)
        return new_unlock


achievement = CRUDAchievement(Achievement)
user_achievement = CRUDUserAchievement(UserAchievement)
