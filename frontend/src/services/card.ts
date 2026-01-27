import { api } from "./api";

export interface Card {
  id: number;
  front_content: string;
  back_content: string;
  deck_id: number;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CardCreate {
  deck_id: number;
  front_content: string;
  back_content: string;
  ease_factor?: number;
  interval?: number;
  repetitions?: number;
  next_review?: string;
  order_index?: number;
}

export interface CardUpdate {
  front_content?: string;
  back_content?: string;
  ease_factor?: number;
  interval?: number;
  repetitions?: number;
  next_review?: string;
  order_index?: number;
}

export interface CardBulkCreateRequest {
  deck_id: number;
  items: Array<{
    front_content: string;
    back_content: string;
    order_index?: number;
  }>;
}

export interface CardBulkUpdateRequest {
  deck_id: number;
  items: Array<{
    id: number;
    front_content?: string;
    back_content?: string;
    ease_factor?: number;
    interval?: number;
    repetitions?: number;
    next_review?: string;
    order_index?: number;
  }>;
}

export interface CardListResponse {
  items: Card[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CardListParams {
  deck_id: number;
  page?: number;
  page_size?: number;
  search?: string;
}

export const cardService = {
  async list(params: CardListParams): Promise<CardListResponse> {
    const response = await api.get<CardListResponse>("/cards", { params });
    return response.data;
  },

  async create(data: CardCreate): Promise<Card> {
    const response = await api.post<Card>("/cards", data);
    return response.data;
  },

  async createBulk(payload: CardBulkCreateRequest): Promise<Card[]> {
    const response = await api.post<Card[]>("/cards/bulk", payload);
    return response.data;
  },

  async update(id: number, data: CardUpdate): Promise<Card> {
    const response = await api.patch<Card>(`/cards/${id}`, data);
    return response.data;
  },

  async updateBulk(payload: CardBulkUpdateRequest): Promise<Card[]> {
    const response = await api.patch<Card[]>("/cards/bulk", payload);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/cards/${id}`);
  },
};

