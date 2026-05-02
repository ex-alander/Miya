import React from "react";
import "./FireConfirmModal.css";

interface FireConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
  variant?: "danger" | "default";
  /** For prompt-style: show input, onConfirm receives string value */
  prompt?: boolean;
  promptPlaceholder?: string;
  promptDefault?: string;
}

export function FireConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = "default",
  prompt = false,
  promptPlaceholder = "",
  promptDefault = "",
}: FireConfirmModalProps) {
  const [promptValue, setPromptValue] = React.useState(promptDefault);

  React.useEffect(() => {
    if (isOpen && prompt) setPromptValue(promptDefault);
  }, [isOpen, prompt, promptDefault]);

  if (!isOpen) return null;

  const handleOk = () => {
    (onConfirm as (v?: string) => void)(prompt ? promptValue : undefined);
  };

  return (
    <div className="fire-confirm-overlay" onClick={onCancel}>
      <div className="fire-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="fire-confirm-title">{title}</h3>
        <p className="fire-confirm-message">{message}</p>
        {prompt && (
          <input
            type="text"
            className="fire-confirm-input"
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            placeholder={promptPlaceholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleOk();
              if (e.key === "Escape") onCancel();
            }}
            autoFocus
          />
        )}
        <div className="fire-confirm-actions">
          <button type="button" className="fire-confirm-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`fire-confirm-ok ${variant === "danger" ? "danger" : ""}`}
            onClick={handleOk}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
