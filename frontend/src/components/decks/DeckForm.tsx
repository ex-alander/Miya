import React, { useState, useEffect } from "react";
import { type Deck, type DeckCreate, type DeckUpdate } from "../../services/deck";
import { validateDeck } from "../../utils/validation";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { ErrorDisplay } from "../ui/ErrorDisplay";
import "./DeckForm.css";

interface DeckFormProps {
  deck?: Deck | null;
  onSubmit: (data: DeckCreate | DeckUpdate) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

export function DeckForm({ deck, onSubmit, onCancel, loading = false, error: externalError }: DeckFormProps) {
  const [title, setTitle] = useState(deck?.title ?? "");
  const [description, setDescription] = useState(deck?.description ?? "");
  const [isPublic, setIsPublic] = useState(deck?.is_public ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (deck) {
      setTitle(deck.title);
      setDescription(deck.description ?? "");
      setIsPublic(deck.is_public);
    }
  }, [deck]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitError(null);

    const validation = validateDeck({ title, description });
    if (!validation.isValid) {
      const errorMap: Record<string, string> = {};
      validation.errors.forEach((err) => {
        errorMap[err.field] = err.message;
      });
      setErrors(errorMap);
      return;
    }

    try {
      const data = deck
        ? ({ title, description: description || null, is_public: isPublic } as DeckUpdate)
        : ({ title, description: description || null, is_public: isPublic } as DeckCreate);
      await onSubmit(data);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to save deck");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="deck-form">
      <h2>{deck ? "Edit Deck" : "Create New Deck"}</h2>

      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        dark
        required
        placeholder="Enter deck title"
        error={errors.title}
      />

      <div className="input-group">
        <label className="input-label">Description (optional)</label>
        <textarea
          className="input input-dark"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter deck description"
          rows={4}
          maxLength={1000}
        />
        {errors.description && (
          <span className="alert alert-error" style={{ fontSize: "0.75rem", padding: "8px" }}>
            {errors.description}
          </span>
        )}
      </div>

      <div className="deck-form-checkbox">
        <label>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          <span>Make this deck public</span>
        </label>
      </div>

      {(submitError || externalError) && (
        <ErrorDisplay error={submitError || externalError || null} />
      )}

      <div className="deck-form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : deck ? "Update Deck" : "Create Deck"}
        </Button>
      </div>
    </form>
  );
}
