"""
SM-2 Spaced Repetition Algorithm Implementation

The SM-2 algorithm is a spaced repetition algorithm that adjusts the interval
between reviews based on the quality of the user's recall.

Algorithm Parameters:
- ease_factor: Starting ease factor (default 2.5)
- min_ease_factor: Minimum ease factor (default 1.3)
- interval_modifier: Multiplier for intervals (default 1.0)
- quality_threshold: Minimum quality to pass (default 3)

Quality Ratings:
- 0: Complete blackout
- 1: Incorrect response; the correct one remembered
- 2: Incorrect response; where the correct one seemed easy
- 3: Correct response recalled with serious difficulty
- 4: Correct response after a hesitation
- 5: Perfect response

References:
- SuperMemo 2 Algorithm: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
"""

from datetime import datetime, timedelta
from typing import Optional


class SM2Config:
    """Configuration for SM-2 algorithm parameters."""

    def __init__(
        self,
        ease_factor: float = 2.5,
        min_ease_factor: float = 1.3,
        interval_modifier: float = 1.0,
        quality_threshold: int = 3,
    ):
        """
        Initialize SM-2 configuration.

        Args:
            ease_factor: Starting ease factor (default 2.5)
            min_ease_factor: Minimum ease factor (default 1.3)
            interval_modifier: Multiplier for intervals (default 1.0)
            quality_threshold: Minimum quality to pass (default 3)
        """
        self.ease_factor = ease_factor
        self.min_ease_factor = min_ease_factor
        self.interval_modifier = interval_modifier
        self.quality_threshold = quality_threshold


class SM2Algorithm:
    """SM-2 Spaced Repetition Algorithm."""

    def __init__(self, config: Optional[SM2Config] = None):
        """
        Initialize SM-2 algorithm with configuration.

        Args:
            config: SM-2 configuration (uses defaults if None)
        """
        self.config = config or SM2Config()

    def calculate_review(
        self,
        quality: int,
        ease_factor: float,
        interval: int,
        repetitions: int,
    ) -> tuple[float, int, int, datetime]:
        """
        Calculate new card parameters based on SM-2 algorithm.

        Args:
            quality: User's quality rating (0-5)
            ease_factor: Current ease factor
            interval: Current interval in days
            repetitions: Current repetition count

        Returns:
            Tuple of (new_ease_factor, new_interval, new_repetitions, next_review_date)

        Raises:
            ValueError: If quality is not in range 0-5
        """
        if not 0 <= quality <= 5:
            raise ValueError("Quality must be between 0 and 5")

        # Calculate new ease factor
        new_ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        new_ease_factor = max(new_ease_factor, self.config.min_ease_factor)

        # Calculate new interval and repetitions
        if quality < self.config.quality_threshold:
            # Failed recall - reset
            new_interval = 1
            new_repetitions = 0
        else:
            # Successful recall
            if repetitions == 0:
                new_interval = 1
            elif repetitions == 1:
                new_interval = 6
            else:
                new_interval = int(interval * new_ease_factor * self.config.interval_modifier)
            
            new_repetitions = repetitions + 1

        # Calculate next review date
        next_review = datetime.now() + timedelta(days=new_interval)

        return new_ease_factor, new_interval, new_repetitions, next_review

    def get_quality_from_simple_rating(self, rating: str) -> int:
        """
        Convert simple rating (Again/Hard/Good/Easy) to quality score.

        Args:
            rating: Simple rating string

        Returns:
            Quality score (0-5)
        """
        rating_map = {
            "again": 0,
            "hard": 2,
            "good": 4,
            "easy": 5,
        }
        return rating_map.get(rating.lower(), 3)


# Default instance
default_sm2 = SM2Algorithm()
