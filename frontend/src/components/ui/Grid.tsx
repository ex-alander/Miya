import React from "react";
import "./Grid.css";

interface GridProps {
  children: React.ReactNode;
  minColumnWidth?: number;
  gap?: number;
}

export function Grid({ children, minColumnWidth = 260, gap = 16 }: GridProps) {
  return (
    <div
      className="responsive-grid"
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${minColumnWidth}px, 1fr))`, gap }}
    >
      {children}
    </div>
  );
}
