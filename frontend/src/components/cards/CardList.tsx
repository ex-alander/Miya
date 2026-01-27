import React, { useEffect, useMemo, useState } from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
  DroppableProvided,
  DraggableProvided,
} from "react-beautiful-dnd";
import { cardService, type Card } from "../../services/card";
import { useApi } from "../../hooks/useApi";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { ErrorDisplay } from "../ui/ErrorDisplay";
import "./CardList.css";

interface CardListProps {
  deckId: number;
  onCreate: () => void;
  onEdit: (card: Card) => void;
  refetchTrigger?: number;
}

export function CardList({ deckId, onCreate, onEdit, refetchTrigger = 0 }: CardListProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const listApi = useApi(cardService.list);
  const deleteApi = useApi(cardService.delete);
  const updateBulkApi = useApi(cardService.updateBulk);

  const loadCards = async (pageNum = 1, searchTerm = "") => {
    const result = await listApi.execute({ deck_id: deckId, page: pageNum, page_size: 50, search: searchTerm });
    if (result) {
      setCards(result.items);
      setTotalPages(result.total_pages);
    }
  };

  useEffect(() => {
    loadCards(page, search);
  }, [page, deckId, refetchTrigger]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCards(1, search);
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    const res = await deleteApi.execute(deleteId);
    if (res !== null) {
      setDeleteId(null);
      loadCards(page, search);
    }
  };

  const orderedCards = useMemo(() => cards.slice().sort((a, b) => a.order_index - b.order_index || a.id - b.id), [cards]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const src = result.source.index;
    const dest = result.destination.index;
    const updated = Array.from(orderedCards);
    const [moved] = updated.splice(src, 1);
    updated.splice(dest, 0, moved);
    const payload = updated.map((c, idx) => ({ id: c.id, order_index: idx }));
    setCards(updated);
    await updateBulkApi.execute({ deck_id: deckId, items: payload });
  };

  return (
    <div className="card-list">
      <div className="card-list-header">
        <h2>Cards</h2>
        <Button onClick={onCreate}>Add Card</Button>
      </div>

      <form onSubmit={onSearchSubmit} className="card-list-search">
        <input
          className="card-search-input"
          type="text"
          placeholder="Search cards..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button variant="outline" size="sm" type="submit">
          Search
        </Button>
      </form>

      <ErrorDisplay error={listApi.error || deleteApi.error || updateBulkApi.error} />
      {(listApi.loading || deleteApi.loading || updateBulkApi.loading) && <LoadingSpinner />}

      {!listApi.loading && orderedCards.length === 0 && (
        <div className="card-list-empty">No cards yet. Create one to begin.</div>
      )}

      {orderedCards.length > 0 && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="cards">
            {(provided: DroppableProvided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="card-dnd-list">
                {orderedCards.map((c, idx) => (
                  <Draggable draggableId={String(c.id)} index={idx} key={c.id}>
                    {(dragProvided: DraggableProvided) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        className="card-dnd-item"
                      >
                        <div className="card-preview">
                          <div className="card-face">
                            <div className="card-face-label">Front</div>
                            <div dangerouslySetInnerHTML={{ __html: c.front_content }} />
                          </div>
                          <div className="card-face">
                            <div className="card-face-label">Back</div>
                            <div dangerouslySetInnerHTML={{ __html: c.back_content }} />
                          </div>
                        </div>
                        <div className="card-item-actions">
                          <Button variant="ghost" size="sm" onClick={() => onEdit(c)}>
                            Edit
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => setDeleteId(c.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {deleteId !== null && (
        <div className="card-delete-confirm">
          <p>Delete this card?</p>
          <div className="card-delete-actions">
            <Button variant="secondary" size="sm" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="card-pagination">
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Prev
          </Button>
          <span className="pagination-info">Page {page} of {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
