import React from "react";
import "./Card.css";

interface CardProps {
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function Card({ children, dark = false, className = "", style, onClick }: CardProps) {
  return (
    <div
      className={`card ${dark ? "card-dark" : ""} ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default", ...style }}
    >
      {children}
    </div>
  );
}
