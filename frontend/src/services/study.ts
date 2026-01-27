import { api } from "./api";

export interface DueCard {
  id: number;
  front_content: string;
  back_content: string;
  deck_id: number;
  deck_title: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review: string;
}

export interface ReviewRequest {
  card_id: number;
  quality: number; // 0-5
  rating?: string; // "again" | "hard" | "good" | "easy"
}

export interface ReviewResponse {
  card_id: number;
  new_ease_factor: number;
  new_interval: number;
  new_repetitions: number;
  next_review: string;
  xp_earned: number;
  coins_earned: number;
  new_streak: number;
}

export interface StudySessionResponse {
  total_cards: number;
  cards_reviewed: number;
  total_xp_earned: number;
  total_coins_earned: number;
  new_streak: number;
  session_duration_seconds: number;
}

export const studyService = {
  async getDueCards(deckId?: number, limit: number = 50): Promise<DueCard[]> {
    const params: Record<string, any> = { limit };
    if (deckId) {
      params.deck_id = deckId;
    }
    const response = await api.get<DueCard[]>("/study/due", { params });
    return response.data;
  },

  async submitReview(request: ReviewRequest): Promise<ReviewResponse> {
    const response = await api.post<ReviewResponse>("/study/review", request);
    return response.data;
  },

  async completeSession(data: {
    total_cards: number;
    cards_reviewed: number;
    total_xp_earned: number;
    total_coins_earned: number;
    session_duration_seconds: number;
  }): Promise<StudySessionResponse> {
    const response = await api.post<StudySessionResponse>("/study/session/complete", data);
    return response.data;
  },
};
