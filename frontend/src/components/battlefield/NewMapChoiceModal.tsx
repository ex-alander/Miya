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
        <h3 className="new-map-choice-title">Новая карта</h3>
        <p className="new-map-choice-sub">
          Пустое поле боя, импорт .map или ИИ из документа
        </p>
        <div className="new-map-choice-actions">
          <button
            type="button"
            className="new-map-choice-card"
            onClick={onPickEmptyMap}
          >
            <span className="new-map-choice-card-label">Пустая карта</span>
            <span className="new-map-choice-card-desc">
              Чистое поле: узлы и связи добавляете вручную.
            </span>
          </button>
          <button
            type="button"
            className="new-map-choice-card primary"
            onClick={onPickAiGeneration}
          >
            <span className="new-map-choice-card-label">ИИ из документа</span>
            <span className="new-map-choice-card-desc">
              PDF, DOCX, TXT или Markdown: модель построит узлы и иерархию автоматически.
            </span>
          </button>
          <button
            type="button"
            className="new-map-choice-card"
            onClick={onPickImportMap}
          >
            <span className="new-map-choice-card-label">Импорт .map</span>
            <span className="new-map-choice-card-desc">
              Восстановить карту из ранее экспортированного файла.
            </span>
          </button>
        </div>
        <button type="button" className="new-map-choice-cancel" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </div>
  );
}
