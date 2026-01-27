"""
Seed script to populate achievements.
Run with: python -m app.db.seed_achievements
"""
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.achievement import Achievement


def seed_achievements():
    db: Session = SessionLocal()
    try:
        # Check if achievements already exist
        existing = db.query(Achievement).count()
        if existing > 0:
            print(f"Achievements already has {existing} items. Skipping seed.")
            return

        achievements = [
            # Chaotic and funny achievements (all dimmed for now - high XP requirements)
            Achievement(
                name="The Procrastinator's Paradox",
                description="Study for 0 minutes but somehow still earn XP. Wait, that's impossible!",
                icon="⏰",
                xp_required=999999,
                is_secret=True,
                is_active=True,
            ),
            Achievement(
                name="Card Collector Supreme",
                description="Create exactly 42 cards. Not 41, not 43. Exactly 42.",
                icon="🎴",
                xp_required=50000,
                is_secret=False,
                is_active=True,
            ),
            Achievement(
                name="The Time Traveler",
                description="Review a card that's due in the past, present, and future simultaneously.",
                icon="🕰️",
                xp_required=100000,
                is_secret=True,
                is_active=True,
            ),
            Achievement(
                name="Streak Breaker",
                description="Break your streak exactly 7 times. The universe demands balance.",
                icon="💔",
                xp_required=75000,
                is_secret=True,
                is_active=True,
            ),
            Achievement(
                name="The Philosopher",
                description="Create a deck with only questions, no answers. Contemplate existence.",
                icon="🤔",
                xp_required=30000,
                is_secret=False,
                is_active=True,
            ),
            Achievement(
                name="Coin Hoarder",
                description="Accumulate 10,000 coins but never spend a single one. The true test of willpower.",
                icon="🐉",
                xp_required=200000,
                is_secret=False,
                is_active=True,
            ),
            Achievement(
                name="The Speed Demon",
                description="Review 100 cards in under 60 seconds. Are you even human?",
                icon="⚡",
                xp_required=150000,
                is_secret=True,
                is_active=True,
            ),
            Achievement(
                name="Deck Destroyer",
                description="Delete a deck you just created. The cycle of creation and destruction.",
                icon="🗑️",
                xp_required=25000,
                is_secret=False,
                is_active=True,
            ),
            Achievement(
                name="The Perfectionist",
                description="Rate every single card as 'Easy' for 30 days straight. No mistakes allowed.",
                icon="✨",
                xp_required=300000,
                is_secret=False,
                is_active=True,
            ),
            Achievement(
                name="Midnight Scholar",
                description="Study at exactly 3:33 AM. The witching hour of learning.",
                icon="🌙",
                xp_required=500000,
                is_secret=True,
                is_active=True,
            ),
            Achievement(
                name="The Contrarian",
                description="Rate every card as 'Again' even when you know it perfectly. Chaos mode activated.",
                icon="🔄",
                xp_required=100000,
                is_secret=True,
                is_active=True,
            ),
            Achievement(
                name="Deck Architect",
                description="Create a deck with 1000 cards. You absolute madlad.",
                icon="🏗️",
                xp_required=400000,
                is_secret=False,
                is_active=True,
            ),
            Achievement(
                name="The Ghost",
                description="Study without earning any XP or coins. Become one with the void.",
                icon="👻",
                xp_required=999999,
                is_secret=True,
                is_active=True,
            ),
            Achievement(
                name="Streak Master",
                description="Maintain a 365-day streak. One full year of dedication!",
                icon="🔥",
                xp_required=500000,
                is_secret=False,
                is_active=True,
            ),
            Achievement(
                name="The Collector",
                description="Own every single shop item. Material wealth achieved.",
                icon="🛍️",
                xp_required=600000,
                is_secret=False,
                is_active=True,
            ),
        ]

        for ach in achievements:
            db.add(ach)

        db.commit()
        print(f"Successfully seeded {len(achievements)} achievements!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding achievements: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_achievements()
