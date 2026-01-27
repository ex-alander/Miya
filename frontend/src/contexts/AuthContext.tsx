import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as authApi from "../services/auth";
import { tokenStorage } from "../utils/storage";

type AuthContextValue = {
  user: authApi.User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<authApi.User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    const tokens = tokenStorage.get();
    if (!tokens) {
      setUser(null);
      return;
    }
    const me = await authApi.me();
    setUser(me);
  }

  async function login(email: string, password: string) {
    const tokens = await authApi.login({ email, password });
    tokenStorage.set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
    await refreshMe();
  }

  async function register(email: string, username: string, password: string) {
    await authApi.register({ email, username, password });
    await login(email, password);
  }

  function logout() {
    tokenStorage.clear();
    setUser(null);
  }

  useEffect(() => {
    (async () => {
      try {
        await refreshMe();
      } catch {
        tokenStorage.clear();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout, refreshMe }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

