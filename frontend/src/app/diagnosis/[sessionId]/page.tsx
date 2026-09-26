"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { WsProvider, useWs, type WsEvent } from "@/lib/ws";
import { ReportCard, type DiagnosisReport } from "@/components/diagnosis/ReportCard";
import { ReconnectingBanner } from "@/components/shared/ReconnectingBanner";

// ── Mock data for demo (replaced by live WS payload) ──

const MOCK_REPORT: DiagnosisReport = {
  sessionId: "demo",
  confidence: "likely",
  rootCause:
    "Node version mismatch between agent environment (20.x) and CI runner (18.x) caused optional-chaining syntax to fail at parse time.",
  evidence: [
    {
      id: "e1",
      text: "Agent ran npm install under Node 20.11.0",
      timelineEventId: "evt-001",
    },
    {
      id: "e2",
      text: "CI runner reports Node 18.19.0 via process.version",
      timelineEventId: "evt-008",
    },
    {
      id: "e3",
      text: "SyntaxError: Unexpected token ?. at line 42 in auth.service.js",
      timelineEventId: "evt-012",
    },
    {
      id: "e4",
      text: "Identical test suite passed in local run 4 minutes prior",
      timelineEventId: "evt-003",
    },
  ],
  affectedComponents: [
    "auth.service.js",
    "CI runner (node:18 image)",
    "npm install step",
  ],
  suggestedNextStep:
    'Pin the CI runner image to node:20-alpine or add an .nvmrc specifying 20.x and update the workflow yml to read from it.',
  isConfirmed: false,
};

// ── Inner page (has WsProvider in scope) ──

interface DiagnosisInnerProps {
  sessionId: string;
}

function DiagnosisInner({ sessionId }: DiagnosisInnerProps) {
  const { connectionState, latencyMs } = useWs();
  const [report, setReport] = useState<DiagnosisReport>({
    ...MOCK_REPORT,
    sessionId,
  });
  const [highlightedEventId, setHighlightedEventId] = useState<string | undefined>();

  const { subscribe } = useWs();

  useEffect(() => {
    return subscribe((event: WsEvent) => {
      if (event.type === "diagnosis.update") {
        setReport((prev) => ({
          ...prev,
          ...(event.payload as Partial<DiagnosisReport>),
          previousConfidence: prev.confidence,
        }));
      }
    });
  }, [subscribe]);

  const isReconnecting =
    connectionState === "reconnecting" || connectionState === "closed";

  return (
    <div className="flex flex-col flex-1">
      <ReconnectingBanner visible={isReconnecting} />

      {/* Nav */}
      <nav className="w-full max-w-[1120px] mx-auto px-6 py-4 flex items-center gap-6 rule-line border-t-0 border-b">
        <Link
          href="/"
          className="font-mono text-[12px] text-text-dim hover:text-text transition-colors"
        >
          ← Dashboard
        </Link>
        <span className="font-mono text-[12px] text-text-dim">
          session: {sessionId}
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
        <Link
          href={`/map/${sessionId}`}
          className="font-mono text-[12px] text-text-dim hover:text-text transition-colors"
        >
          Dep map →
        </Link>
      </nav>

      {/* Report — on the dark background, max 760px, centred */}
      <main className="flex flex-col flex-1 items-center px-6 py-12">
        <ReportCard
          report={report}
          onRunVerification={() => {
            window.location.href = `/verification/${sessionId}`;
          }}
          onGenerateRegressionTest={() => {
            window.location.href = `/verification/${sessionId}?tab=regression`;
          }}
          onTraceEvent={(eventId) => {
            setHighlightedEventId(eventId);
            window.location.href = `/timeline/${sessionId}?event=${eventId}`;
          }}
        />
      </main>
    </div>
  );
}

// ── Page ──

export default function DiagnosisPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);

  return (
    <WsProvider sessionId={sessionId}>
      <DiagnosisInner sessionId={sessionId} />
    </WsProvider>
  );
}
