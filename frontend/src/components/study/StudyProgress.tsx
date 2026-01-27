import React from "react";
import "./StudyProgress.css";

interface StudyProgressProps {
  current: number;
  total: number;
  xpEarned: number;
  coinsEarned: number;
  streak: number;
  timeElapsed: number; // seconds
}

export function StudyProgress({
  current,
  total,
  xpEarned,
  coinsEarned,
  streak,
  timeElapsed,
}: StudyProgressProps) {
  const progress = total > 0 ? (current / total) * 100 : 0;
  const minutes = Math.floor(timeElapsed / 60);
  const seconds = timeElapsed % 60;

  return (
    <div className="study-progress">
      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
        <span className="progress-text">
          {current} / {total}
        </span>
      </div>

      <div className="study-stats">
        <div className="stat-item">
          <span className="stat-label">XP</span>
          <span className="stat-value">{xpEarned}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Coins</span>
          <span className="stat-value">{coinsEarned} 💰</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Streak</span>
          <span className="stat-value">{streak} 🔥</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Time</span>
          <span className="stat-value">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
        </div>
      </div>
    </div>
  );
}
