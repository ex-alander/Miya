"""
Economy Service for XP, Coins, and Streak Management

This service handles:
- XP calculation based on card difficulty and streak
- Coin rewards for consistent study
- Daily streak tracking
"""

from datetime import datetime, date, timedelta
from typing import Optional


class EconomyService:
    """Service for managing user economy (XP, coins, streaks)."""

    # XP Configuration
    BASE_XP_PER_CARD = 10
    XP_MULTIPLIER_BY_QUALITY = {
        0: 0,  # No XP for failed reviews
        1: 0.2,
        2: 0.5,
        3: 0.8,
        4: 1.0,
        5: 1.2,  # Bonus for perfect recall
    }

    # Coin Configuration
    COINS_PER_CARD = 1
    STREAK_BONUS_THRESHOLDS = [3, 7, 14, 30]  # Days for bonus coins
    STREAK_BONUS_COINS = [5, 10, 25, 50]  # Bonus coins for each threshold

    # Difficulty multipliers
    DIFFICULTY_MULTIPLIERS = {
        "easy": 0.8,  # Lower XP for easy cards
        "normal": 1.0,
        "hard": 1.5,  # Higher XP for hard cards
    }

    def calculate_xp(
        self,
        quality: int,
        ease_factor: float,
        streak: int = 0,
        difficulty: str = "normal",
    ) -> int:
        """
        Calculate XP earned for a card review.

        Args:
            quality: User's quality rating (0-5)
            ease_factor: Card's ease factor (difficulty indicator)
            streak: Current study streak
            difficulty: Card difficulty level ("easy", "normal", "hard")

        Returns:
            XP points earned
        """
        if quality == 0:
            return 0  # No XP for complete failure

        # Base XP with quality multiplier
        quality_multiplier = self.XP_MULTIPLIER_BY_QUALITY.get(quality, 1.0)
        base_xp = int(self.BASE_XP_PER_CARD * quality_multiplier)

        # Difficulty multiplier
        difficulty_mult = self.DIFFICULTY_MULTIPLIERS.get(difficulty, 1.0)

        # Streak bonus (small bonus for consistent study)
        streak_bonus = min(streak * 0.1, 0.5)  # Max 50% bonus

        # Ease factor adjustment (harder cards = more XP)
        ease_adjustment = max(0.8, min(1.2, ease_factor / 2.5))

        total_xp = int(base_xp * difficulty_mult * (1 + streak_bonus) * ease_adjustment)

        return max(1, total_xp)  # Minimum 1 XP for any successful review

    def calculate_coins(
        self,
        quality: int,
        current_streak: int,
        previous_last_study: Optional[datetime] = None,
    ) -> tuple[int, int]:
        """
        Calculate coins earned and new streak.

        Args:
            quality: User's quality rating (0-5)
            current_streak: Current daily study streak
            previous_last_study: Previous study date (for streak calculation)

        Returns:
            Tuple of (coins_earned, new_streak)
        """
        coins_earned = 0
        new_streak = current_streak

        # Only award coins for successful reviews (quality >= 3)
        if quality >= 3:
            coins_earned = self.COINS_PER_CARD

            # Calculate streak
            today = date.today()
            if previous_last_study:
                last_study_date = previous_last_study.date()
                days_diff = (today - last_study_date).days

                if days_diff == 0:
                    # Same day - maintain streak
                    new_streak = current_streak
                elif days_diff == 1:
                    # Consecutive day - increment streak
                    new_streak = current_streak + 1
                else:
                    # Streak broken - reset to 1
                    new_streak = 1
            else:
                # First study - start streak
                new_streak = 1

            # Streak bonus coins
            for threshold, bonus in zip(self.STREAK_BONUS_THRESHOLDS, self.STREAK_BONUS_COINS):
                if new_streak == threshold:
                    coins_earned += bonus
                    break

        return coins_earned, new_streak

    def get_difficulty_from_ease_factor(self, ease_factor: float) -> str:
        """
        Determine card difficulty from ease factor.

        Args:
            ease_factor: Card's ease factor

        Returns:
            Difficulty level ("easy", "normal", "hard")
        """
        if ease_factor >= 2.5:
            return "easy"
        elif ease_factor >= 1.8:
            return "normal"
        else:
            return "hard"


# Default instance
economy_service = EconomyService()
