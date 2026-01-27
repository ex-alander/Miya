import React, { useState, useEffect } from "react";
import { deckService, type Deck, type DeckListParams } from "../../services/deck";
import { useApi } from "../../hooks/useApi";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { ErrorDisplay } from "../ui/ErrorDisplay";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import "./DeckList.css";

interface DeckListProps {
  onCreateClick: () => void;
  onEditClick: (deck: Deck) => void;
  onDeckClick?: (deck: Deck) => void;
  onStudyClick?: (deck: Deck) => void;
  refetchTrigger?: number;
}

export function DeckList({ onCreateClick, onEditClick, onDeckClick, onStudyClick, refetchTrigger = 0 }: DeckListProps) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { loading, error, execute } = useApi(deckService.list);
  const deleteApi = useApi(deckService.delete);

  const loadDecks = async (pageNum: number = 1, search: string = "") => {
    const params: DeckListParams = {
      page: pageNum,
      page_size: 20,
    };
    if (search) {
      params.search = search;
    }
    const result = await execute(params);
    if (result) {
      setDecks(result.items);
      setTotalPages(result.total_pages);
    }
  };

  useEffect(() => {
    loadDecks(page, searchTerm);
  }, [page, refetchTrigger]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadDecks(1, searchTerm);
  };

  const handleDelete = async () => {
    if (deleteConfirmId === null) return;
    const result = await deleteApi.execute(deleteConfirmId);
    if (result !== null) {
      setDeleteConfirmId(null);
      loadDecks(page, searchTerm);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="deck-list">
      <div className="deck-list-header">
        <h2>Your Decks</h2>
        <Button onClick={onCreateClick}>Create Deck</Button>
      </div>

      <form onSubmit={handleSearch} className="deck-list-search">
        <input
          type="text"
          placeholder="Search decks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="deck-search-input"
        />
        <Button type="submit" size="sm">Search</Button>
      </form>

      <ErrorDisplay error={error} />

      {loading && <LoadingSpinner />}

      {!loading && decks.length === 0 && !error && (
        <div className="deck-list-empty">
          <p>No decks found. Create your first deck to get started!</p>
        </div>
      )}

      {!loading && decks.length > 0 && (
        <>
          <div className="deck-grid">
            {decks.map((deck) => (
              <Card
                key={deck.id}
                dark
                className="deck-card"
                onClick={() => onDeckClick?.(deck)}
              >
                <div className="deck-card-header">
                  <h3 className="deck-card-title">{deck.title}</h3>
                  {deck.is_public && (
                    <span className="deck-badge-public">Public</span>
                  )}
                </div>
                {deck.description && (
                  <p className="deck-card-description">{deck.description}</p>
                )}
                <div className="deck-card-footer">
                  <span className="deck-card-date">
                    Created {formatDate(deck.created_at)}
                  </span>
                  <div className="deck-card-actions">
                    {onStudyClick && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStudyClick(deck);
                        }}
                      >
                        Study
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditClick(deck);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(deck.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="deck-list-pagination">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="pagination-info">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        title="Delete Deck"
        message="Are you sure you want to delete this deck? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
