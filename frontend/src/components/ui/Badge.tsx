import React from "react";
import "./Badge.css";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "gold" | "orange";
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {children}
    </span>
  );
}
