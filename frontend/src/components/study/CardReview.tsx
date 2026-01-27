import React, { useState } from "react";
import { CardFlip } from "../cards/CardFlip";
import { Button } from "../ui/Button";
import { DueCard } from "../../services/study";
import { stripHtml } from "../../utils/html";
import "./CardReview.css";

interface CardReviewProps {
  card: DueCard;
  onRate: (quality: number, rating?: string) => void;
  isLoading?: boolean;
}

export function CardReview({ card, onRate, isLoading = false }: CardReviewProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(true);
  };

  const handleRate = (quality: number, rating?: string) => {
    onRate(quality, rating);
    setIsFlipped(false);
  };

  // Strip HTML tags for display
  const frontText = stripHtml(card.front_content);
  const backText = stripHtml(card.back_content);

  return (
    <div className="card-review">
      <div className="card-review-container">
        <CardFlip
          frontContent={frontText}
          backContent={backText}
          isFlipped={isFlipped}
          onFlip={handleFlip}
        />
      </div>

      {!isFlipped ? (
        <div className="card-review-actions">
          <Button onClick={handleFlip} size="lg" disabled={isLoading}>
            Show Answer
          </Button>
        </div>
      ) : (
        <div className="card-review-rating">
          <p className="rating-label">How well did you know this?</p>
          <div className="rating-buttons">
            <Button
              variant="danger"
              onClick={() => handleRate(0, "again")}
              disabled={isLoading}
            >
              Again
            </Button>
            <Button
              variant="outline"
              onClick={() => handleRate(2, "hard")}
              disabled={isLoading}
            >
              Hard
            </Button>
            <Button
              variant="primary"
              onClick={() => handleRate(4, "good")}
              disabled={isLoading}
            >
              Good
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleRate(5, "easy")}
              disabled={isLoading}
            >
              Easy
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
