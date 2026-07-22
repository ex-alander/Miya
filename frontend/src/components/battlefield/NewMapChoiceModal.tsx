import React from "react";
import "./NewMapChoiceModal.css";

type Props = {
  isOpen: boolean;
  onPickEmptyMap: () => void;
  onPickImportMap: () => void;
  onPickAiGeneration: () => void;
  onCancel: () => void;
};

export function NewMapChoiceModal({
  isOpen,
  onPickEmptyMap,
  onPickImportMap,
  onPickAiGeneration,
  onCancel,
}: Props) {
  if (!isOpen) return null;
  return (
    <div className="new-map-choice-overlay" onClick={onCancel}>
      <div className="new-map-choice-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="new-map-choice-title">New Map</h3>
        <p className="new-map-choice-sub">
          Empty battlefield, import .map, or AI generation
        </p>
        <div className="new-map-choice-actions">
          <button
            type="button"
            className="new-map-choice-card"
            onClick={onPickEmptyMap}
          >
            <span className="new-map-choice-card-label">Empty Map</span>
            <span className="new-map-choice-card-desc">
              Blank canvas: add nodes and connections manually.
            </span>
          </button>
          <button
            type="button"
            className="new-map-choice-card primary"
            onClick={onPickAiGeneration}
          >
            <span className="new-map-choice-card-label">AI Generation</span>
            <span className="new-map-choice-card-desc">
              PDF, DOCX, TXT, or Markdown: model builds nodes and hierarchy automatically.
            </span>
          </button>
          <button
            type="button"
            className="new-map-choice-card"
            onClick={onPickImportMap}
          >
            <span className="new-map-choice-card-label">Import .map</span>
            <span className="new-map-choice-card-desc">
              Restore a map from a previously exported file.
            </span>
          </button>
        </div>
        <button type="button" className="new-map-choice-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}