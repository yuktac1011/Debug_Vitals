"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// ── Types matching BACKEND.md WebSocket event shapes ──────────────

export type ConnectionState = "connecting" | "open" | "reconnecting" | "closed";

export type WsEventType =
  | "diagnosis.update"
  | "timeline.event"
  | "verification.update"
  | "regression.result"
  | "session.started"
  | "session.ended";

export interface WsEvent<T = unknown> {
  type: WsEventType;
  session_id: string;
  payload: T;
  timestamp: string;
}

interface WsContextValue {
  connectionState: ConnectionState;
  latencyMs: number | null;
  subscribe: (handler: (event: WsEvent) => void) => () => void;
  send: (data: unknown) => void;
}

const WsContext = createContext<WsContextValue | null>(null);

const BACKEND_WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";

const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 10;
const PING_INTERVAL_MS = 30_000;

interface WsProviderProps {
  sessionId: string;
  children: React.ReactNode;
}

export function WsProvider({ sessionId, children }: WsProviderProps) {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<(event: WsEvent) => void>>(new Set());
  const reconnectAttempts = useRef(0);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pingTimestampRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    const url = `${BACKEND_WS_URL}/session/${sessionId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionState("open");
      reconnectAttempts.current = 0;

      // Start ping/pong for latency tracking
      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          pingTimestampRef.current = Date.now();
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, PING_INTERVAL_MS);
    };

    ws.onmessage = (ev) => {
      let data: WsEvent | { type: "pong" };
      try {
        data = JSON.parse(ev.data as string);
      } catch {
        return;
      }

      if ("type" in data && data.type === "pong") {
        if (pingTimestampRef.current != null) {
          setLatencyMs(Date.now() - pingTimestampRef.current);
          pingTimestampRef.current = null;
        }
        return;
      }

      const event = data as WsEvent;
      handlersRef.current.forEach((h) => h(event));
    };

    ws.onclose = () => {
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);

      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        setConnectionState("reconnecting");
        reconnectAttempts.current += 1;
        setTimeout(connect, RECONNECT_DELAY_MS);
      } else {
        setConnectionState("closed");
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [sessionId]);

  useEffect(() => {
    connect();
    return () => {
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback((handler: (event: WsEvent) => void) => {
    handlersRef.current.add(handler);
    return () => handlersRef.current.delete(handler);
  }, []);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return (
    <WsContext.Provider value={{ connectionState, latencyMs, subscribe, send }}>
      {children}
    </WsContext.Provider>
  );
}

export function useWs() {
  const ctx = useContext(WsContext);
  if (!ctx) throw new Error("useWs must be used inside <WsProvider>");
  return ctx;
}
