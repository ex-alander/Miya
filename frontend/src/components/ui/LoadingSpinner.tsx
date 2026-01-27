import React from "react";
import "./LoadingSpinner.css";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
}

export function LoadingSpinner({ size = "md", className = "", style }: LoadingSpinnerProps) {
  return (
    <div className={`loading-spinner loading-spinner-${size} ${className}`} style={style}>
      <div className="spinner"></div>
    </div>
  );
}
