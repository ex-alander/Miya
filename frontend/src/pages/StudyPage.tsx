import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { CardReview } from "../components/study/CardReview";
import { StudyProgress } from "../components/study/StudyProgress";
import { SessionSummary } from "../components/study/SessionSummary";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";
import { Modal } from "../components/ui/Modal";
import { studyService, DueCard, ReviewResponse, StudySessionResponse } from "../services/study";
import { useApi } from "../hooks/useApi";
import { useToast } from "../components/ui/ToastProvider";
import "./StudyPage.css";

function StudyPageContent() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [cards, setCards] = useState<DueCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionStartTime] = useState(Date.now());
  const [xpEarned, setXpEarned] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const loadCardsApi = useApi(studyService.getDueCards);
  const reviewApi = useApi(studyService.submitReview);

  useEffect(() => {
    loadCards();
  }, [deckId]);

  useEffect(() => {
    // Stop timer when summary is shown
    if (showSummary) return;
    
    const timer = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [sessionStartTime, showSummary]); // ← Add showSummary to dependencies

  const loadCards = async () => {
    const deckIdNum = deckId ? parseInt(deckId) : undefined;
    const result = await loadCardsApi.execute(deckIdNum);
    if (result) {
      setCards(result);
      if (result.length === 0) {
        showToast("No cards due for review!", "info");
        navigate("/decks");
      }
    }
  };

  const handleRate = async (quality: number, rating?: string) => {
    if (currentIndex >= cards.length) return;

    const card = cards[currentIndex];
    const result = await reviewApi.execute({
      card_id: card.id,
      quality,
      rating,
    });

    if (result) {
      setXpEarned((prev) => prev + result.xp_earned);
      setCoinsEarned((prev) => prev + result.coins_earned);
      setCurrentStreak(result.new_streak);

      // Move to next card
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Session complete
        completeSession(result);
      }
    }
  };

  const completeSession = async (lastReview: ReviewResponse) => {
    // Send the exact structure expected by the API
    const sessionData = {
      total_cards: cards.length,
      cards_reviewed: currentIndex + 1, // Fixed: use currentIndex + 1 instead of cards.length
      total_xp_earned: xpEarned + lastReview.xp_earned,
      total_coins_earned: coinsEarned + lastReview.coins_earned,
      session_duration_seconds: timeElapsed,
    };
  
    try {
      const result = await studyService.completeSession(sessionData);
      setShowSummary(true);
      // Optional: update streak if needed
      setCurrentStreak(result.new_streak);
    } catch (error) {
      console.error("Failed to complete session:", error);
      showToast("Failed to save session results", "error");
    }
  };

  const handleClose = () => {
    navigate("/decks");
  };

  const handleRestart = () => {
    setShowSummary(false);
    setCurrentIndex(0);
    setXpEarned(0);
    setCoinsEarned(0);
    setTimeElapsed(0);
    loadCards();
  };

  if (loadCardsApi.loading) {
    return (
      <div className="study-page">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (loadCardsApi.error) {
    return (
      <div className="study-page">
        <ErrorDisplay error={loadCardsApi.error} />
        <button onClick={() => navigate("/decks")}>Back to Decks</button>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="study-page">
        <div className="no-cards">
          <h2>No cards due for review</h2>
          <button onClick={() => navigate("/decks")}>Back to Decks</button>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="study-page">
      <div className="study-container">
        <StudyProgress
          current={currentIndex + 1}
          total={cards.length}
          xpEarned={xpEarned}
          coinsEarned={coinsEarned}
          streak={currentStreak}
          timeElapsed={timeElapsed}
        />

        {showSummary ? (
          <SessionSummary
            session={{
              total_cards: cards.length,
              cards_reviewed: cards.length,
              total_xp_earned: xpEarned,
              total_coins_earned: coinsEarned,
              new_streak: currentStreak,
              session_duration_seconds: timeElapsed,
            }}
            onClose={handleClose}
            onRestart={handleRestart}
          />
        ) : (
          <>
            <CardReview
              card={currentCard}
              onRate={handleRate}
              isLoading={reviewApi.loading}
            />
            <ErrorDisplay error={reviewApi.error} />
          </>
        )}
      </div>
    </div>
  );
}

export default function StudyPage() {
  return (
    <ProtectedRoute>
      <StudyPageContent />
    </ProtectedRoute>
  );
}
