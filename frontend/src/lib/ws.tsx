"use client"

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react"

type WsStatus = "connecting" | "connected" | "disconnected"

interface WsMessage {
  type: string
  session_id?: string
  payload?: Record<string, unknown>
}

interface WsContextValue {
  status: WsStatus
  lastMessage: WsMessage | null
  latencyMs: number | null
  send: (msg: object) => void
}

const WsContext = createContext<WsContextValue>({
  status: "disconnected",
  lastMessage: null,
  latencyMs: null,
  send: () => {},
})

export function WsProvider({ sessionId, children }: { sessionId: string; children: React.ReactNode }) {
  const [status, setStatus]           = useState<WsStatus>("connecting")
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null)
  const [latencyMs, setLatencyMs]     = useState<number | null>(null)
  const wsRef     = useRef<WebSocket | null>(null)
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const attempts  = useRef(0)

  const connect = useCallback(() => {
    if (typeof window === "undefined") return
    const wsUrl = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws/session/${sessionId}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      attempts.current = 0
      setStatus("connected")
      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping", ts: Date.now() }))
        }
      }, 25_000)
    }

    ws.onmessage = (e) => {
      try {
        const msg: WsMessage & { ts?: number } = JSON.parse(e.data)
        if (msg.type === "pong" && msg.ts) {
          setLatencyMs(Date.now() - msg.ts)
          return
        }
        setLastMessage(msg)
      } catch {}
    }

    ws.onerror = () => setStatus("disconnected")

    ws.onclose = () => {
      if (pingTimer.current) clearInterval(pingTimer.current)
      setStatus("disconnected")
      if (attempts.current < 8) {
        attempts.current++
        setTimeout(connect, Math.min(1_000 * 2 ** attempts.current, 30_000))
      }
    }
  }, [sessionId])

  useEffect(() => {
    connect()
    return () => {
      if (pingTimer.current) clearInterval(pingTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return (
    <WsContext.Provider value={{ status, lastMessage, latencyMs, send }}>
      {children}
    </WsContext.Provider>
  )
}

export function useWs() {
  return useContext(WsContext)
}
