import React from "react";
import { Button } from "../ui/Button";
import { StudySessionResponse } from "../../services/study";
import "./SessionSummary.css";

interface SessionSummaryProps {
  session: StudySessionResponse;
  onClose: () => void;
  onRestart?: () => void;
}

export function SessionSummary({ session, onClose, onRestart }: SessionSummaryProps) {
  const totalSeconds = session.session_duration_seconds;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formatTime = () => {
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="session-summary">
      <div className="session-summary-content">
        <h2 className="summary-title">Session Complete!</h2>
        
        <p className="summary-message">
          Congratulations! You got <strong>{session.total_coins_earned} coins</strong>, <strong>{session.total_xp_earned} XP</strong>, and you did it in <strong>{formatTime()}</strong>!
        </p>

        <div className="summary-stats">
          <div className="summary-stat highlight">
            <div className="summary-stat-value">{session.total_xp_earned}</div>
            <div className="summary-stat-label">XP Earned</div>
          </div>

          <div className="summary-stat highlight">
            <div className="summary-stat-value">{session.total_coins_earned} 💰</div>
            <div className="summary-stat-label">Coins Earned</div>
          </div>

          <div className="summary-stat">
            <div className="summary-stat-value">{session.cards_reviewed}</div>
            <div className="summary-stat-label">Cards Reviewed</div>
          </div>

          <div className="summary-stat">
            <div className="summary-stat-value">{session.new_streak} 🔥</div>
            <div className="summary-stat-label">Day Streak</div>
          </div>
        </div>

        <div className="summary-actions">
          {onRestart && (
            <Button variant="primary" size="lg" onClick={onRestart}>
              Go Again
            </Button>
          )}
          <Button variant="secondary" size="lg" onClick={onClose}>
            Go to Decks
          </Button>
        </div>
      </div>
    </div>
  );
}
