"use client";

import { use, useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ReconnectingBanner } from "@/components/shared/ReconnectingBanner";
import { WsProvider, useWs } from "@/lib/ws";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

function LayoutInner({
  sessionId,
  children,
}: {
  sessionId: string;
  children: React.ReactNode;
}) {
  const { connectionState } = useWs();
  const [backendOk, setBackendOk] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(4000) })
      .then((r) => setBackendOk(r.ok))
      .catch(() => setBackendOk(false));
  }, []);

  const wsState =
    connectionState === "open"
      ? "connected"
      : connectionState === "reconnecting"
        ? "reconnecting"
        : "disconnected";

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden" }}>
      <Sidebar sessionId={sessionId} wsState={wsState} backendOk={backendOk} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflowY: "auto", background: "#F9FBFB" }}>
        <ReconnectingBanner
          visible={
            connectionState === "reconnecting" || connectionState === "closed"
          }
        />
        {children}
      </div>
    </div>
  );
}

export default function SessionLayout({
  params,
  children,
}: {
  params: Promise<{ sessionId: string }>;
  children: React.ReactNode;
}) {
  const { sessionId } = use(params);

  return (
    <WsProvider sessionId={sessionId}>
      <LayoutInner sessionId={sessionId}>{children}</LayoutInner>
    </WsProvider>
  );
}
