import React from "react";
import "./Input.css";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  dark?: boolean;
  error?: string;
}

export function Input({ label, dark = false, error, className = "", ...props }: InputProps) {
  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}
      <input
        className={`input ${dark ? "input-dark" : ""} ${error ? "input-error" : ""} ${className}`}
        {...props}
      />
      {error && <span className="alert alert-error" style={{ fontSize: "0.75rem", padding: "8px" }}>{error}</span>}
    </div>
  );
}
