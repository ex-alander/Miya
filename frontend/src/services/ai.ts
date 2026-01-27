import { api } from "./api";

export interface TextToDeckRequest {
  text: string;
  deck_title?: string | null;
}

export interface TextToDeckResponse {
  deck_id: number;
  title: string;
  description: string | null;
  cards_created: number;
  message: string;
}

export interface AIStatus {
  available: boolean;
  service: string;
}

export const aiService = {
  async generateDeckFromText(
    text: string,
    deckTitle?: string | null
  ): Promise<TextToDeckResponse> {
    const response = await api.post<TextToDeckResponse>("/ai/text-to-deck", {
      text,
      deck_title: deckTitle || null,
    });
    return response.data;
  },

  async getStatus(): Promise<AIStatus> {
    const response = await api.get<AIStatus>("/ai/status");
    return response.data;
  },
};
