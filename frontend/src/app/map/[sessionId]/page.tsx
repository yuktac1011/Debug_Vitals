"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { WsProvider, useWs, type WsEvent } from "@/lib/ws";
import { DependencyMap } from "@/components/graph/DependencyMap";
import { ReconnectingBanner } from "@/components/shared/ReconnectingBanner";
import type { GraphNode, GraphEdge } from "@/components/graph/Node";

// ── Mock graph data ──

const MOCK_NODES: GraphNode[] = [
  {
    id: "runtime-ci",
    label: "Node runtime",
    type: "runtime",
    state: "divergent",
    mismatchLabel: "expected 20.x, found 18.x",
    x: 40,
    y: 200,
    width: 160,
    height: 64,
  },
  {
    id: "npm-install",
    label: "npm install",
    type: "dependency",
    state: "normal",
    x: 260,
    y: 120,
    width: 130,
  },
  {
    id: "auth-service",
    label: "auth.service.js",
    type: "service",
    state: "divergent",
    mismatchLabel: "SyntaxError ?. line 42",
    x: 260,
    y: 240,
    width: 150,
    height: 64,
  },
  {
    id: "test-suite",
    label: "Test suite",
    type: "test",
    state: "divergent",
    mismatchLabel: "3 failed",
    x: 480,
    y: 200,
    width: 130,
    height: 64,
  },
  {
    id: "ci-runner",
    label: "CI runner",
    type: "service",
    state: "normal",
    x: 680,
    y: 200,
    width: 120,
  },
];

const MOCK_EDGES: GraphEdge[] = [
  { id: "e1", fromId: "runtime-ci", toId: "npm-install" },
  { id: "e2", fromId: "runtime-ci", toId: "auth-service" },
  { id: "e3", fromId: "auth-service", toId: "test-suite" },
  { id: "e4", fromId: "test-suite", toId: "ci-runner" },
];

// ── Inner ──

interface MapInnerProps {
  sessionId: string;
}

function MapInner({ sessionId }: MapInnerProps) {
  const { connectionState, latencyMs, subscribe } = useWs();
  const [nodes, setNodes] = useState<GraphNode[]>(MOCK_NODES);
  const [edges, setEdges] = useState<GraphEdge[]>(MOCK_EDGES);

  useEffect(() => {
    return subscribe((wsEvent: WsEvent) => {
      if (wsEvent.type === "diagnosis.update") {
        const payload = wsEvent.payload as {
          nodes?: GraphNode[];
          edges?: GraphEdge[];
        };
        if (payload.nodes) setNodes(payload.nodes);
        if (payload.edges) setEdges(payload.edges);
      }
    });
  }, [subscribe]);

  const isReconnecting =
    connectionState === "reconnecting" || connectionState === "closed";

  return (
    <div className="flex flex-col flex-1">
      <ReconnectingBanner visible={isReconnecting} />

      <nav className="w-full max-w-[1120px] mx-auto px-6 py-4 flex items-center gap-6 border-b border-[rgba(140,138,130,0.14)]">
        <Link
          href={`/diagnosis/${sessionId}`}
          className="font-mono text-[12px] text-text-dim hover:text-text transition-colors"
        >
          ← Diagnosis
        </Link>
        <span className="font-mono text-[12px] text-text-dim">
          dep map · session: {sessionId}
        </span>
        <span className="font-mono text-[12px] text-text-dim ml-auto">
          ws:{" "}
          <span
            className={
              connectionState === "open"
                ? "text-confirmed"
                : connectionState === "reconnecting"
                  ? "text-pending"
                  : "text-divergent"
            }
          >
            {connectionState}
            {connectionState === "open" && latencyMs != null
              ? `, ${latencyMs}ms`
              : ""}
          </span>
        </span>
        <Link
          href={`/timeline/${sessionId}`}
          className="font-mono text-[12px] text-text-dim hover:text-text transition-colors"
        >
          Timeline →
        </Link>
      </nav>

      <main className="flex flex-col flex-1 w-full max-w-[1120px] mx-auto px-6 py-8">
        <h1 className="text-h2 text-text mb-2">Dependency &amp; Environment Map</h1>
        <p className="font-sans text-[13px] text-text-dim mb-6">
          Runtime → dependency → service → test relationships. Divergent nodes
          are labeled with the actual mismatch.
        </p>

        <div className="bg-ink-raised p-4">
          <DependencyMap nodes={nodes} edges={edges} />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4">
          <span className="font-mono text-[11px] text-text-dim flex items-center gap-2">
            <span className="inline-block w-3 h-3 border-2 border-divergent" />
            divergent (mismatch)
          </span>
          <span className="font-mono text-[11px] text-text-dim flex items-center gap-2">
            <span className="inline-block w-3 h-3 border border-text-dim" />
            normal
          </span>
          <span className="font-mono text-[11px] text-text-dim flex items-center gap-2">
            <span className="inline-block w-3 h-3 border-2 border-confirmed" />
            confirmed
          </span>
        </div>
      </main>
    </div>
  );
}

// ── Page ──

export default function MapPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);

  return (
    <WsProvider sessionId={sessionId}>
      <MapInner sessionId={sessionId} />
    </WsProvider>
  );
}
