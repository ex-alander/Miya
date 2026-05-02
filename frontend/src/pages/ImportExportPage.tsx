import React, { useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";
import { useToast } from "../components/ui/ToastProvider";
import {
  importExportService,
  ImportDeckPreview,
  ImportCardPreview,
  ImportApplyDeck,
} from "../services/importExport";

export default function ImportExportPage() {
  const { showToast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [jsonText, setJsonText] = useState("");
  const [previews, setPreviews] = useState<ImportDeckPreview[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingApply, setLoadingApply] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFiles(Array.from(e.target.files));
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...dropped]);
  };

  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
  };

  const handleToggleCard = (deckIndex: number, cardId: number) => {
    if (!previews) return;
    setPreviews((prev) =>
      prev
        ? prev.map((deck, idx) =>
            idx === deckIndex
              ? {
                  ...deck,
                  cards: deck.cards.map((c) =>
                    c.temp_id === cardId ? { ...c, selected: !c.selected } : c,
                  ),
                }
              : deck,
          )
        : prev,
    );
  };

  const handleIncludeAll = (deckIndex: number) => {
    if (!previews) return;
    setPreviews((prev) =>
      prev
        ? prev.map((deck, idx) =>
            idx === deckIndex
              ? { ...deck, cards: deck.cards.map((c) => ({ ...c, selected: true })) }
              : deck,
          )
        : prev,
    );
  };

  const handleExcludeAll = (deckIndex: number) => {
    if (!previews) return;
    setPreviews((prev) =>
      prev
        ? prev.map((deck, idx) =>
            idx === deckIndex
              ? { ...deck, cards: deck.cards.map((c) => ({ ...c, selected: false })) }
              : deck,
          )
        : prev,
    );
  };

  const handlePreview = async () => {
    setError(null);
    setLoadingPreview(true);
    try {
      const resp = await importExportService.preview(files, jsonText);
      setPreviews(resp.items);
      showToast(
        `Preview ready: ${resp.total_decks} deck(s), ${resp.total_cards} card(s), ${resp.total_duplicates} duplicate(s)`,
        "info",
      );
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? String(e));
      showToast("Failed to build import preview", "error");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleApply = async () => {
    if (!previews) return;
    setError(null);
    setLoadingApply(true);
    try {
      const decks: ImportApplyDeck[] = previews.map((deck) => ({
        deck: deck.deck,
        cards: deck.cards,
        conflict_mode: "create_new",
        existing_deck_id: null,
      }));
      const resp = await importExportService.apply({ decks });
      const imported = resp.results.reduce((acc, r) => acc + r.imported_cards, 0);
      const skipped = resp.results.reduce((acc, r) => acc + r.skipped_duplicates, 0);
      showToast(`Imported ${imported} cards, skipped ${skipped} duplicates`, "success", 5000);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? String(e));
      showToast("Failed to apply import", "error");
    } finally {
      setLoadingApply(false);
    }
  };

  const handleDownloadHistory = async () => {
    try {
      const history = await importExportService.history();
      const lines = history.map(
        (h) =>
          `${h.created_at} | ${h.action.toUpperCase()} | format=${h.format} | deck_id=${h.deck_id ?? "-"} | total_cards=${
            h.total_cards ?? "-"
          } | ${h.details ?? ""}`,
      );
      const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "miya-import-export-history.txt";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Failed to load history", "error");
    }
  };

  return (
    <div className="container" style={{ paddingTop: "32px", paddingBottom: "48px" }}>
      <div className="animate-fade-in" style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2.25rem", marginBottom: "8px" }}>Import</h1>
        <p style={{ color: "rgba(255, 255, 255, 0.72)", marginBottom: "24px" }}>
          Import decks from Miya JSON or .apkg files, preview and selectively apply changes, and export your decks in
          multiple formats.
        </p>

        <Card className="card-dark" style={{ marginBottom: "24px" }}>
          <div
            className="import-drop-zone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <p className="import-drop-zone-title">Drag & drop .json / .apkg files here</p>
            <p className="import-drop-zone-sub">or choose files from your computer</p>
            <label className="import-drop-zone-btn">
              <input
                type="file"
                multiple
                accept=".json,.apkg"
                onChange={handleFilesChange}
                className="import-drop-zone-input"
              />
              Choose files
            </label>
          </div>

          {files.length > 0 && (
            <p style={{ fontSize: "0.9rem", marginBottom: "16px" }}>
              Selected files:{" "}
              {files.map((f) => f.name).join(", ")}
            </p>
          )}

          <div style={{ marginTop: "16px" }}>
            <label htmlFor="json-input" style={{ display: "block", marginBottom: "8px", color: "var(--fire-gray)" }}>
              Or paste Miya JSON directly:
            </label>
            <textarea
              id="json-input"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={6}
              className="import-json-textarea"
              placeholder='{"deck": {...}, "cards": [...]}'
            />
          </div>

          <div style={{ marginTop: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
            <Button onClick={handlePreview} disabled={loadingPreview}>
              {loadingPreview ? (
                <>
                  <LoadingSpinner size="sm" style={{ marginRight: 8 }} /> Building preview...
                </>
              ) : (
                "Build Preview"
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={handleApply}
              disabled={!previews || loadingApply}
            >
              {loadingApply ? (
                <>
                  <LoadingSpinner size="sm" style={{ marginRight: 8 }} /> Importing...
                </>
              ) : (
                "Apply Import"
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownloadHistory}>
              Download History
            </Button>
          </div>
        </Card>

        <ErrorDisplay error={error} />

        {previews && previews.length > 0 && (
          <Card className="card-dark">
            <h2 style={{ marginBottom: "12px", fontSize: "1.5rem" }}>Preview</h2>
            {previews.map((deck, deckIdx) => (
              <div key={deckIdx} className="import-preview-deck">
                <div className="import-preview-deck-header">
                  <strong>{deck.deck.title}</strong>{" "}
                  <span className="import-preview-deck-meta">
                    ({deck.total_cards} cards, {deck.duplicate_cards} duplicates) — source: {deck.source_name}
                  </span>
                </div>
                <div className="import-preview-actions">
                  <Button variant="outline" size="sm" onClick={() => handleIncludeAll(deckIdx)}>
                    Include all
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExcludeAll(deckIdx)}>
                    Exclude all
                  </Button>
                </div>
                <div className="import-preview-cards">
                  {deck.cards.map((card: ImportCardPreview) => (
                    <div
                      key={card.temp_id}
                      className={`import-preview-card ${card.selected ? "import-preview-card-included" : "import-preview-card-excluded"}`}
                    >
                      <label className="import-preview-checkbox-wrap">
                        <input
                          type="checkbox"
                          checked={card.selected}
                          onChange={() => handleToggleCard(deckIdx, card.temp_id)}
                          className="import-preview-checkbox"
                        />
                        <span className="import-preview-checkbox-custom" aria-hidden />
                      </label>
                      <div className="import-preview-card-body">
                        <div className="import-preview-card-front">{card.front_content}</div>
                        <div className="import-preview-card-back">{card.back_content}</div>
                        <div className="import-preview-card-meta">
                          {card.is_duplicate ? "Duplicate" : "New card"}
                          {card.tags && card.tags.length > 0 && ` • Tags: ${card.tags.join(", ")}`}
                          {card.hint && ` • Hint: ${card.hint}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

