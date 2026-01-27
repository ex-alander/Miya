import React from "react";
import "./CardFlip.css";

interface CardFlipProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  isFlipped: boolean;
  onFlip: () => void;
}

export function CardFlip({ frontContent, backContent, isFlipped, onFlip }: CardFlipProps) {
  return (
    <div className={`flip-card ${isFlipped ? "is-flipped" : ""}`} onClick={onFlip}>
      <div className="flip-card-inner">
        <div className="flip-card-face flip-card-front">{frontContent}</div>
        <div className="flip-card-face flip-card-back">{backContent}</div>
      </div>
    </div>
  );
}
