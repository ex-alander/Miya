import React from "react";
import "./StatCard.css";

interface StatCardProps {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ value, label, icon, className = "" }: StatCardProps) {
  return (
    <div className={`stat-card ${className}`}>
      {icon && <div style={{ marginBottom: "8px" }}>{icon}</div>}
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
