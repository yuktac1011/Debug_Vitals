"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { WsProvider, useWs, type WsEvent } from "@/lib/ws";
import { TimelineRail } from "@/components/timeline/TimelineRail";
import { ReconnectingBanner } from "@/components/shared/ReconnectingBanner";
import type { TimelineEvent } from "@/components/timeline/TimelineRow";

// ── Mock data ──

const MOCK_EVENTS: TimelineEvent[] = [
  {
    id: "evt-001",
    timestamp: "14:02:11.034",
    eventType: "agent_action",
    description: "Agent ran: npm install (Node 20.11.0)",
    rawPayload: "added 342 packages in 8.4s\naudit found 0 vulnerabilities",
  },
  {
    id: "evt-003",
    timestamp: "14:02:19.801",
    eventType: "test",
    description: "Local test run: 48 passed, 0 failed",
    rawPayload: "PASS src/__tests__/auth.test.ts\nPASS src/__tests__/db.test.ts",
  },
  {
    id: "evt-007",
    timestamp: "14:03:44.112",
    eventType: "file_change",
    description: "git push origin main → triggered CI workflow",
  },
  {
    id: "evt-008",
    timestamp: "14:03:50.229",
    eventType: "command",
    description: "CI: node --version → v18.19.0",
    isImplicated: true,
    rawPayload: "v18.19.0",
  },
  {
    id: "evt-010",
    timestamp: "14:03:51.990",
    eventType: "command",
    description: "CI: npm install (Node 18.19.0)",
    rawPayload: "added 342 packages in 9.1s",
  },
  {
    id: "evt-012",
    timestamp: "14:03:58.447",
    eventType: "result",
    description: "CI test run: 0 passed, 3 failed",
    isImplicated: true,
    rawPayload:
      "FAIL src/__tests__/auth.test.ts\n  ● SyntaxError: Unexpected token ?. at line 42 in auth.service.js\n\nFAIL src/__tests__/db.test.ts\n  ● SyntaxError: Unexpected token ?. at line 42 in auth.service.js",
  },
];

// ── Inner ──

interface TimelineInnerProps {
  sessionId: string;
  initialHighlight?: string;
}

function TimelineInner({ sessionId, initialHighlight }: TimelineInnerProps) {
  const { connectionState, latencyMs, subscribe } = useWs();
  const [events, setEvents] = useState<TimelineEvent[]>(MOCK_EVENTS);
  const [highlightedEventId, setHighlightedEventId] = useState<string | undefined>(
    initialHighlight
  );

  useEffect(() => {
    return subscribe((wsEvent: WsEvent) => {
      if (wsEvent.type === "timeline.event") {
        const newEvent = wsEvent.payload as TimelineEvent;
        setEvents((prev) => [...prev, newEvent]);
      }
    });
  }, [subscribe]);

  // Scroll the highlighted event into view
  useEffect(() => {
    if (highlightedEventId) {
      const el = document.getElementById(`event-${highlightedEventId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightedEventId]);

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
          timeline · session: {sessionId}
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
          href={`/map/${sessionId}`}
          className="font-mono text-[12px] text-text-dim hover:text-text transition-colors"
        >
          Dep map →
        </Link>
      </nav>

      <main className="flex flex-col flex-1 w-full max-w-[1120px] mx-auto px-6 py-8">
        <h1 className="text-h2 text-text mb-6">Agent Timeline</h1>

        <div className="bg-ink-raised">
          <TimelineRail
            events={events}
            highlightedEventId={highlightedEventId}
          />
        </div>

        <p className="font-mono text-[11px] text-text-dim mt-4">
          {events.length} events · implicated events are marked with a left border and label
        </p>
      </main>
    </div>
  );
}

// ── Page ──

export default function TimelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ event?: string }>;
}) {
  const { sessionId } = use(params);
  const { event } = use(searchParams);

  return (
    <WsProvider sessionId={sessionId}>
      <TimelineInner sessionId={sessionId} initialHighlight={event} />
    </WsProvider>
  );
}
