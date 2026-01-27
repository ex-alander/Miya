import { api } from "./api";

export type User = {
  id: number;
  email: string;
  username: string;
  xp: number;
  coins: number;
  created_at: string;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export async function register(payload: { email: string; username: string; password: string }): Promise<User> {
  const res = await api.post<User>("/auth/register", payload);
  return res.data;
}

export async function login(payload: { email: string; password: string }): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>("/auth/login", payload);
  return res.data;
}

export async function me(): Promise<User> {
  const res = await api.get<User>("/users/me");
  return res.data;
}

