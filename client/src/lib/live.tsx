// Real-time channel: nominee-gap alerts and case updates over WebSocket.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { tokenStore } from './api';
import { useAuth } from './auth';

export interface LiveEvent { type: string; data: any; at: string }
type Listener = (e: LiveEvent) => void;

const Ctx = createContext<{ connected: boolean; subscribe: (fn: Listener) => () => void }>(null!);

export function LiveProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const listeners = useRef(new Set<Listener>());

  useEffect(() => {
    if (!user) return;
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout>;
    let closed = false;
    const open = () => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${location.host}/ws?token=${tokenStore.get()}`);
      ws.onopen = () => setConnected(true);
      ws.onmessage = (m) => {
        const e = JSON.parse(m.data) as LiveEvent;
        listeners.current.forEach((fn) => fn(e));
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closed) retry = setTimeout(open, 2000);
      };
    };
    open();
    return () => {
      closed = true;
      clearTimeout(retry);
      ws?.close();
    };
  }, [user?.id]);

  const subscribe = useCallback((fn: Listener) => {
    listeners.current.add(fn);
    return () => void listeners.current.delete(fn);
  }, []);
  return <Ctx.Provider value={{ connected, subscribe }}>{children}</Ctx.Provider>;
}

export function useLive(fn: Listener) {
  const { subscribe } = useContext(Ctx);
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => subscribe((e) => ref.current(e)), [subscribe]);
}

export const useLiveStatus = () => useContext(Ctx).connected;
