import { api } from "./api";

export interface MiyaDeckMeta {
  title: string;
  description?: string | null;
  is_public?: boolean;
  tags?: string[] | null;
}

export interface MiyaCard {
  front_content: string;
  back_content: string;
  tags?: string[] | null;
  hint?: string | null;
}

export interface ImportCardPreview {
  temp_id: number;
  front_content: string;
  back_content: string;
  tags?: string[] | null;
  hint?: string | null;
  is_duplicate: boolean;
  selected: boolean;
}

export interface ImportDeckPreview {
  source_name: string;
  deck: MiyaDeckMeta;
  cards: ImportCardPreview[];
  total_cards: number;
  duplicate_cards: number;
}

export interface ImportPreviewResponse {
  items: ImportDeckPreview[];
  total_decks: number;
  total_cards: number;
  total_duplicates: number;
}

export interface ImportApplyDeck {
  deck: MiyaDeckMeta;
  cards: ImportCardPreview[];
  conflict_mode: "create_new" | "merge_into_existing";
  existing_deck_id?: number | null;
}

export interface ImportApplyRequest {
  decks: ImportApplyDeck[];
}

export interface ImportApplyResult {
  deck_id: number;
  imported_cards: number;
  skipped_duplicates: number;
}

export interface ImportApplyResponse {
  results: ImportApplyResult[];
}

export interface ImportExportHistoryItem {
  id: number;
  deck_id: number | null;
  action: "import" | "export";
  format: string;
  total_cards: number | null;
  details: string | null;
  created_at: string;
}

export interface ImportExportHistoryResponse {
  items: ImportExportHistoryItem[];
}

export const importExportService = {
  async preview(files: File[], jsonText?: string): Promise<ImportPreviewResponse> {
    const form = new FormData();
    for (const file of files) {
      form.append("files", file);
    }
    if (jsonText && jsonText.trim().length > 0) {
      form.append("json_text", jsonText);
    }
    const response = await api.post<ImportPreviewResponse>("/decks/import-export/import/preview", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  async apply(request: ImportApplyRequest): Promise<ImportApplyResponse> {
    const response = await api.post<ImportApplyResponse>("/decks/import-export/import/apply", request);
    return response.data;
  },

  async download(deckId: number, format: "json" | "md" | "pdf" | "apkg"): Promise<Blob> {
    const response = await api.get(`/decks/import-export/export/${deckId}`, {
      params: { format },
      responseType: "blob",
    });
    return response.data;
  },

  async history(): Promise<ImportExportHistoryItem[]> {
    const response = await api.get<ImportExportHistoryResponse>("/decks/import-export/history");
    return response.data.items;
  },
};

