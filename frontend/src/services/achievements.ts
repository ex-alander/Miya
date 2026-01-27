import { api } from "./api";

export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string | null;
  xp_required: number;
  is_secret: boolean;
  is_active: boolean;
  created_at: string;
  unlocked: boolean;
  unlocked_at: string | null;
}

export const achievementService = {
  async getAll(): Promise<Achievement[]> {
    const response = await api.get<Achievement[]>("/achievements/");
    return response.data;
  },
};
