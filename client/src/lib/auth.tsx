import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, tokenStore, type Meta, type User } from './api';

interface AuthCtx {
  user: User | null;
  meta: Meta | null;
  loading: boolean;
  setSession: (token: string, user: User) => void;
  refresh: () => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) return setUser(null);
    try {
      setUser((await api<{ user: User }>('/me')).user);
    } catch {
      tokenStore.set(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    Promise.all([refresh(), api<Meta>('/meta').then(setMeta).catch(() => {})]).finally(() => setLoading(false));
  }, [refresh]);

  const setSession = (token: string, u: User) => {
    tokenStore.set(token);
    setUser(u);
  };
  const logout = () => {
    tokenStore.set(null);
    setUser(null);
  };

  return <Ctx.Provider value={{ user, meta, loading, setSession, refresh, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
