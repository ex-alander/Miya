"""
Seed script to populate shop items.
Run with: python -m app.db.seed_shop
"""
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.shop_item import ShopItem


def seed_shop_items():
    db: Session = SessionLocal()
    try:
        # Check if items already exist
        existing = db.query(ShopItem).count()
        if existing > 0:
            print(f"Shop already has {existing} items. Skipping seed.")
            return

        items = [
            # Functional items (easiest + most fun)
            ShopItem(
                name="XP Boost",
                description="Double XP for your next study session!",
                price=50,
                item_type="boost",
                effect_data='{"xp_multiplier": 2, "duration": 1}',
                icon="⚡",
                is_active=True,
            ),
            ShopItem(
                name="Coin Magnet",
                description="Earn 2x coins on your next review session!",
                price=75,
                item_type="boost",
                effect_data='{"coin_multiplier": 2, "duration": 1}',
                icon="💰",
                is_active=True,
            ),
            # Future items (not functional yet)
            ShopItem(
                name="Streak Freeze",
                description="Protect your streak for one day if you miss studying!",
                price=100,
                item_type="boost",
                effect_data='{"streak_freeze": true}',
                icon="❄️",
                is_active=True,
            ),
            ShopItem(
                name="Perfect Day Badge",
                description="Show off your perfect study day with this exclusive badge!",
                price=200,
                item_type="cosmetic",
                effect_data='{"badge": "perfect_day"}',
                icon="🏆",
                is_active=True,
            ),
            ShopItem(
                name="Fire Avatar",
                description="Unlock a custom Fire Nation avatar for your profile!",
                price=150,
                item_type="cosmetic",
                effect_data='{"avatar": "fire_nation"}',
                icon="🔥",
                is_active=True,
            ),
            ShopItem(
                name="Golden Card Back",
                description="Make your flashcards shine with golden card backs!",
                price=120,
                item_type="cosmetic",
                effect_data='{"card_theme": "golden"}',
                icon="✨",
                is_active=True,
            ),
            ShopItem(
                name="Study Streak Unlock",
                description="Unlock the ability to see your longest study streak!",
                price=300,
                item_type="unlock",
                effect_data='{"feature": "longest_streak"}',
                icon="📊",
                is_active=True,
            ),
            ShopItem(
                name="Master Deck Creator",
                description="Unlock advanced deck creation features!",
                price=250,
                item_type="unlock",
                effect_data='{"feature": "advanced_decks"}',
                icon="🎴",
                is_active=True,
            ),
            ShopItem(
                name="Time Traveler",
                description="Review cards from any date in your history!",
                price=500,
                item_type="unlock",
                effect_data='{"feature": "time_travel"}',
                icon="⏰",
                is_active=True,
            ),
            ShopItem(
                name="Mystery Box",
                description="A mysterious box that could contain anything!",
                price=1000,
                item_type="boost",
                effect_data='{"mystery": true}',
                icon="📦",
                is_active=True,
            ),
        ]

        for item in items:
            db.add(item)

        db.commit()
        print(f"Successfully seeded {len(items)} shop items!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding shop items: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_shop_items()
