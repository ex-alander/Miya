import React, { useCallback, useEffect, useRef, useState } from "react";
import { extractDocumentText } from "../../utils/extractDocumentText";
import { mentalMapService } from "../../services/mentalMap";
import "./AIGenerationModal.css";

const LOADING_PHRASES = [
  "Пламя знаний разгорается…",
  "Анализ сущности текста…",
  "Разметка территории ума…",
  "Искры связей вспыхивают…",
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (mapId: number) => void;
  onError: (message: string) => void;
};

export function AIGenerationModal({
  isOpen,
  onClose,
  onComplete,
  onError,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [truncateWarn, setTruncateWarn] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const [mapTitle, setMapTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    setFile(null);
    setExtractedText(null);
    setTruncateWarn(null);
    setExtracting(false);
    setLoading(false);
    setMapTitle("");
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  useEffect(() => {
    if (!isOpen) {
      reset();
      return;
    }
  }, [isOpen, reset]);

  useEffect(() => {
    if (!loading) return;
    const t = window.setInterval(() => {
      setLoadingPhraseIndex((i) => (i + 1) % LOADING_PHRASES.length);
    }, 2200);
    return () => clearInterval(t);
  }, [loading]);

  const processFile = useCallback(async (f: File) => {
    setFile(f);
    setExtracting(true);
    setExtractedText(null);
    setTruncateWarn(null);
    try {
      const { text, warn } = await extractDocumentText(f);
      setExtractedText(text);
      setTruncateWarn(warn);
    } catch {
      onError("Не удалось извлечь текст из файла");
      setFile(null);
    } finally {
      setExtracting(false);
    }
  }, [onError]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const f = e.dataTransfer.files?.[0];
      if (f) void processFile(f);
    },
    [processFile]
  );

  const onPickFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) void processFile(f);
    },
    [processFile]
  );

  const canEssence =
    Boolean(extractedText && extractedText.length >= 20 && !extracting && !loading);

  const runEssence = async () => {
    if (!extractedText || extractedText.length < 20) return;
    setLoading(true);
    setLoadingPhraseIndex(0);
    try {
      const data = await mentalMapService.generateFromText({
        text: extractedText,
        title: mapTitle.trim() || undefined,
      });
      onComplete(data.id);
      onClose();
      reset();
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { detail?: string } } };
      const detail = err.response?.data?.detail;
      const msg =
        typeof detail === "string"
          ? detail
          : err.response?.status === 503
            ? "ИИ недоступен: проверьте ключ GROQ на сервере."
            : "Не удалось сгенерировать карту";
      onError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ai-gen-overlay" onClick={onClose}>
      <div className="ai-gen-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ai-gen-header">
          <h3 className="ai-gen-title">Проявление знаний</h3>
          <button type="button" className="ai-gen-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>
        <p className="ai-gen-lead">
          Перетащите PDF, DOCX, TXT или Markdown. Затем нажмите "Essence", чтобы ИИ построил карту на поле боя.
        </p>

        <div
          ref={dropRef}
          className={`ai-gen-drop ${file ? "has-file" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.markdown,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="ai-gen-file-input"
            onChange={onPickFile}
          />
          {extracting ? (
            <span className="ai-gen-drop-text">Чтение документа…</span>
          ) : file ? (
            <span className="ai-gen-drop-text">{file.name}</span>
          ) : (
            <span className="ai-gen-drop-text">
              Нажмите или перетащите файл сюда
            </span>
          )}
        </div>

        {truncateWarn && (
          <div className="ai-gen-warn" role="status">
            {truncateWarn}
          </div>
        )}

        <label className="ai-gen-label">Название карты (необязательно)</label>
        <input
          type="text"
          className="ai-gen-input"
          value={mapTitle}
          onChange={(e) => setMapTitle(e.target.value)}
          placeholder="Подсказка для ИИ; иначе заголовок придумает модель"
          disabled={loading}
        />

        {loading && (
          <div className="ai-gen-loading">
            <div className="ai-gen-flame" aria-hidden />
            <p className="ai-gen-loading-text">{LOADING_PHRASES[loadingPhraseIndex]}</p>
            <div className="ai-gen-progress">
              <div className="ai-gen-progress-bar" />
            </div>
          </div>
        )}

        <div className="ai-gen-actions">
          <button type="button" className="ai-gen-cancel" onClick={onClose} disabled={loading}>
            Отмена
          </button>
          <button
            type="button"
            className="ai-gen-essence"
            disabled={!canEssence}
            onClick={() => void runEssence()}
          >
            Essence
          </button>
        </div>
      </div>
    </div>
  );
}
