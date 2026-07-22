import React, { useCallback, useEffect, useRef, useState } from "react";
import { extractDocumentText } from "../../utils/extractDocumentText";
import { mentalMapService } from "../../services/mentalMap";
import "./AIGenerationModal.css";

const LOADING_PHRASES = [
  "Flame of knowledge ignites…",
  "Analyzing text essence…",
  "Mapping the territory of mind…",
  "Sparks of connections flare up…",
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
      onError("Failed to extract text from file");
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
            ? "AI unavailable: check API key (PROXY_API_KEY or GROQ_API_KEY) on the server."
            : "Failed to generate map";
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
          <h3 className="ai-gen-title">Knowledge Manifestation</h3>
          <button type="button" className="ai-gen-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="ai-gen-lead">
          Drag & drop PDF, DOCX, TXT, or Markdown. Then click "Essence" to let AI build a map on the battlefield.
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
            <span className="ai-gen-drop-text">Reading document…</span>
          ) : file ? (
            <span className="ai-gen-drop-text">{file.name}</span>
          ) : (
            <span className="ai-gen-drop-text">
              Click or drag a file here
            </span>
          )}
        </div>

        {truncateWarn && (
          <div className="ai-gen-warn" role="status">
            {truncateWarn}
          </div>
        )}

        <label className="ai-gen-label">Map title (optional)</label>
        <input
          type="text"
          className="ai-gen-input"
          value={mapTitle}
          onChange={(e) => setMapTitle(e.target.value)}
          placeholder="Hint for AI; otherwise model will generate a title"
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
            Cancel
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