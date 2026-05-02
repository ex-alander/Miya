import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DeckList } from "../components/decks/DeckList";
import { DeckForm } from "../components/decks/DeckForm";
import { Card } from "../components/ui/Card";
import {
  deckService,
  type Deck,
  type DeckCreate,
  type DeckUpdate,
} from "../services/deck";
import { useApi } from "../hooks/useApi";

export default function DecksPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const navigate = useNavigate();

  const createApi = useApi(deckService.create);
  const updateApi = useApi(deckService.update);

  const handleCreateClick = () => {
    setEditingDeck(null);
    setShowForm(true);
  };

  const handleEditClick = (deck: Deck) => {
    setEditingDeck(deck);
    setShowForm(true);
  };

  const handleFormSubmit = async (data: DeckCreate | DeckUpdate) => {
    if (editingDeck) {
      await updateApi.execute(editingDeck.id, data);
    } else {
      await createApi.execute(data);
    }
    setShowForm(false);
    setEditingDeck(null);
    setRefetchTrigger((prev) => prev + 1);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingDeck(null);
  };

  const handleDeckClick = (deck: Deck) => {
    navigate(`/decks/${deck.id}`);
  };

  const handleStudyClick = (deck: Deck) => {
    navigate(`/study/${deck.id}`);
  };

  if (showForm) {
    return (
      <div
        className="container"
        style={{ paddingTop: "32px", paddingBottom: "48px" }}
      >
        <div
          className="animate-fade-in"
          style={{ maxWidth: "800px", margin: "0 auto" }}
        >
          <Card dark>
            <DeckForm
              deck={editingDeck}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              loading={createApi.loading || updateApi.loading}
              error={createApi.error || updateApi.error}
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div
      className="container"
      style={{ paddingTop: "32px", paddingBottom: "48px" }}
    >
      <div
        className="animate-fade-in"
        style={{ maxWidth: "1200px", margin: "0 auto" }}
      >
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "2.25rem", marginBottom: "8px" }}>Decks</h1>
          <p style={{ color: "rgba(255, 255, 255, 0.72)" }}>
            Navigate, control, and master your knowledge.
          </p>
        </div>

        <DeckList
          onCreateClick={handleCreateClick}
          onEditClick={handleEditClick}
          onDeckClick={handleDeckClick}
          onStudyClick={handleStudyClick}
          refetchTrigger={refetchTrigger}
        />
      </div>
    </div>
  );
}
