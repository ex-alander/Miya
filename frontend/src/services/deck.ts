import { api } from "./api";

export interface Deck {
  id: number;
  title: string;
  description: string | null;
  user_id: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeckCreate {
  title: string;
  description?: string | null;
  is_public?: boolean;
}

export interface DeckUpdate {
  title?: string;
  description?: string | null;
  is_public?: boolean;
}

export interface DeckListResponse {
  items: Deck[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DeckListParams {
  page?: number;
  page_size?: number;
  is_public?: boolean;
  search?: string;
}

export const deckService = {
  async list(params: DeckListParams = {}): Promise<DeckListResponse> {
    const response = await api.get<DeckListResponse>("/decks", { params });
    return response.data;
  },

  async getPublic(params: DeckListParams = {}): Promise<DeckListResponse> {
    const response = await api.get<DeckListResponse>("/decks/public", { params });
    return response.data;
  },

  async getById(id: number): Promise<Deck> {
    const response = await api.get<Deck>(`/decks/${id}`);
    return response.data;
  },

  async create(data: DeckCreate): Promise<Deck> {
    const response = await api.post<Deck>("/decks", data);
    return response.data;
  },

  async update(id: number, data: DeckUpdate): Promise<Deck> {
    const response = await api.patch<Deck>(`/decks/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/decks/${id}`);
  },
};
