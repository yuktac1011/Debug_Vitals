"use client"

import { use } from "react"
import { WsProvider } from "@/lib/ws"
import Sidebar from "@/components/Sidebar"

export default function SessionLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = use(params)

  return (
    <WsProvider sessionId={sessionId}>
      <div style={{ display: "flex", minHeight: "100dvh" }}>
        <Sidebar sessionId={sessionId} />
        <div style={{ flex: 1, overflowY: "auto", minWidth: 0, position: "relative", zIndex: 1 }}>
          <div style={{ maxWidth: 1140, margin: "0 auto", padding: "32px clamp(20px, 3vw, 48px) 64px" }}>
            {children}
          </div>
        </div>
      </div>
    </WsProvider>
  )
}
