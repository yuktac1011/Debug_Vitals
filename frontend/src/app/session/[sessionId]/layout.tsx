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
        <div style={{ flex: 1, overflow: "auto" }}>
          {children}
        </div>
      </div>
    </WsProvider>
  )
}
