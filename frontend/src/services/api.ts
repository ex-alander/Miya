import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { tokenStorage } from "../utils/storage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds
});

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryRequest(
  config: AxiosRequestConfig,
  retriesLeft: number = MAX_RETRIES
): Promise<any> {
  try {
    return await api.request(config);
  } catch (error) {
    const axiosError = error as AxiosError;
    
    // Don't retry on 4xx errors (except 401 which is handled by interceptor)
    if (axiosError.response && axiosError.response.status >= 400 && axiosError.response.status < 500) {
      throw error;
    }
    
    // Retry on network errors or 5xx errors
    if (retriesLeft > 0 && (axiosError.code === "ECONNABORTED" || axiosError.code === "ERR_NETWORK" || (axiosError.response?.status && axiosError.response.status >= 500))) {
      await sleep(RETRY_DELAY * (MAX_RETRIES - retriesLeft + 1));
      return retryRequest(config, retriesLeft - 1);
    }
    
    throw error;
  }
}

let isRefreshing = false;
let refreshWaiters: Array<(token: string | null) => void> = [];

function notifyWaiters(token: string | null) {
  refreshWaiters.forEach((cb) => cb(token));
  refreshWaiters = [];
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const tokens = tokenStorage.get();
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (!original) throw error;

    if (error.response?.status !== 401 || original._retry) {
      throw error;
    }

    original._retry = true;

    const tokens = tokenStorage.get();
    if (!tokens?.refreshToken) {
      tokenStorage.clear();
      throw error;
    }

    if (isRefreshing) {
      const newAccess = await new Promise<string | null>((resolve) => refreshWaiters.push(resolve));
      if (!newAccess) throw error;
      original.headers.Authorization = `Bearer ${newAccess}`;
      return api.request(original);
    }

    isRefreshing = true;
    try {
      const resp = await axios.post(
        `${API_BASE_URL}/api/auth/refresh`,
        { refresh_token: tokens.refreshToken },
        { headers: { "Content-Type": "application/json" } },
      );
      const { access_token, refresh_token } = resp.data as { access_token: string; refresh_token: string };
      tokenStorage.set({ accessToken: access_token, refreshToken: refresh_token });
      notifyWaiters(access_token);
      original.headers.Authorization = `Bearer ${access_token}`;
      return api.request(original);
    } catch (e) {
      tokenStorage.clear();
      notifyWaiters(null);
      throw e;
    } finally {
      isRefreshing = false;
    }
  },
);

