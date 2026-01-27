import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CardForm } from "../components/cards/CardForm";
import { CardList } from "../components/cards/CardList";
import { Card as CardType, cardService, CardCreate, CardUpdate } from "../services/card";
import { deckService, type Deck } from "../services/deck";
import { useApi } from "../hooks/useApi";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";

export default function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const deckApi = useApi(deckService.getById);
  const createCardApi = useApi(cardService.create);
  const updateCardApi = useApi(cardService.update);

  useEffect(() => {
    if (!deckId) return;
    deckApi.execute(Number(deckId)).then((data) => {
      if (data) setDeck(data);
    });
  }, [deckId]);

  const handleCardCreate = () => {
    setEditingCard(null);
    setShowForm(true);
  };

  const handleCardEdit = (card: CardType) => {
    setEditingCard(card);
    setShowForm(true);
  };

  const handleFormSubmit = async (data: CardCreate | CardUpdate) => {
    if (!deck) return;
    if (editingCard) {
      await updateCardApi.execute(editingCard.id, data);
    } else {
      await createCardApi.execute({ ...(data as CardCreate), deck_id: deck.id });
    }
    setShowForm(false);
    setEditingCard(null);
    setRefetchTrigger((prev) => prev + 1); // Trigger card list refresh
  };

  const loading = deckApi.loading || createCardApi.loading || updateCardApi.loading;
  const error = deckApi.error || createCardApi.error || updateCardApi.error;

  if (!deckId) return <div className="container">Deck not found.</div>;
  if (!deck && deckApi.loading) return <LoadingSpinner />;

  return (
    <div className="container" style={{ paddingTop: "32px", paddingBottom: "48px" }}>
      <div className="animate-fade-in" style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
          ← Back
        </Button>

        {deck && (
          <Card className="card-dark" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <h1 style={{ marginBottom: 8 }}>{deck.title}</h1>
                {deck.description && (
                  <p style={{ color: "rgba(255, 255, 255, 0.75)" }}>{deck.description}</p>
                )}
                <div style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.9rem" }}>
                  {deck.is_public ? "Public deck" : "Private deck"}
                </div>
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate(`/study/${deck.id}`)}
              >
                Study Deck
              </Button>
            </div>
          </Card>
        )}

        <ErrorDisplay error={error} />

        {deck && (
          <CardList 
            deckId={deck.id} 
            onCreate={handleCardCreate} 
            onEdit={handleCardEdit}
            refetchTrigger={refetchTrigger}
          />
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingCard ? "Edit Card" : "Create Card"} size="lg">
        {deck && (
          <CardForm
            deckId={deck.id}
            initial={
              editingCard
                ? {
                    id: editingCard.id,
                    front_content: editingCard.front_content,
                    back_content: editingCard.back_content,
                  }
                : null
            }
            onSubmit={handleFormSubmit}
            onCancel={() => setShowForm(false)}
            loading={loading}
            error={error}
          />
        )}
      </Modal>
    </div>
  );
}
