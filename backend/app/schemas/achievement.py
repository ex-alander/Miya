from datetime import datetime

from pydantic import BaseModel


class AchievementResponse(BaseModel):
    id: int
    name: str
    description: str
    icon: str | None
    xp_required: int
    is_secret: bool
    is_active: bool
    created_at: datetime
    unlocked: bool = False
    unlocked_at: datetime | None = None

    class Config:
        from_attributes = True
