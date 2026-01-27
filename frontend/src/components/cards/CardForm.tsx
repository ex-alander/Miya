import React, { useEffect, useState } from "react";
import { type CardCreate, type CardUpdate } from "../../services/card";
import { Button } from "../ui/Button";
import { ErrorDisplay } from "../ui/ErrorDisplay";
import { RichTextEditor } from "../ui/RichTextEditor";
import { Input } from "../ui/Input";
import "./CardForm.css";

interface CardFormProps {
  deckId: number;
  onSubmit: (data: CardCreate | CardUpdate) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
  initial?: {
    id?: number;
    front_content: string;
    back_content: string;
  } | null;
}

export function CardForm({ deckId, onSubmit, onCancel, loading = false, error: externalError, initial }: CardFormProps) {
  const [front, setFront] = useState(initial?.front_content ?? "");
  const [back, setBack] = useState(initial?.back_content ?? "");
  const [orderIndex, setOrderIndex] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setFront(initial.front_content);
      setBack(initial.back_content);
    } else {
      setFront("");
      setBack("");
    }
  }, [initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!front.trim() || !back.trim()) {
      setError("Front and back content are required.");
      return;
    }
    const payload: CardCreate | CardUpdate = initial
      ? { front_content: front, back_content: back, order_index: orderIndex }
      : { deck_id: deckId, front_content: front, back_content: back, order_index: orderIndex };
    await onSubmit(payload);
  };

  return (
    <form className="card-form" onSubmit={handleSubmit}>
      <h2 style={{ margin: 0, color: "var(--fire-white)" }}>{initial ? "Edit Card" : "New Card"}</h2>

      <RichTextEditor
        label="Front"
        value={front}
        onChange={setFront}
        placeholder="Front content..."
      />

      <RichTextEditor
        label="Back"
        value={back}
        onChange={setBack}
        placeholder="Back content..."
      />

      <Input
        label="Order (optional)"
        type="number"
        value={orderIndex ?? ""}
        onChange={(e) => setOrderIndex(e.target.value === "" ? undefined : Number(e.target.value))}
        dark
      />

      {(error || externalError) && <ErrorDisplay error={error || externalError || null} />}

      <div className="card-form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Saving..." : "Save Card"}
        </Button>
      </div>
    </form>
  );
}
