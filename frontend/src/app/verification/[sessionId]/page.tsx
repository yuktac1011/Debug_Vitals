"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { WsProvider, useWs, type WsEvent } from "@/lib/ws";
import {
  VerificationPanel,
  type VerificationState,
} from "@/components/verification/VerificationPanel";
import {
  RegressionGuardPanel,
  type RegressionGuardState,
} from "@/components/verification/RegressionGuardPanel";
import { ReconnectingBanner } from "@/components/shared/ReconnectingBanner";
import { Button } from "@/components/shared/Button";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

// ── Initial idle states ──

const INITIAL_VERIFICATION: VerificationState = {
  hypothesis: "Rerunning the failing test suite under Node 20.x to confirm the version mismatch.",
  status: "idle",
};

const INITIAL_REGRESSION: RegressionGuardState = {
  isVisible: false,
  status: "idle",
};

// ── Inner ──

interface VerificationInnerProps {
  sessionId: string;
  initialTab: "verification" | "regression";
}

function VerificationInner({ sessionId, initialTab }: VerificationInnerProps) {
  const { connectionState, latencyMs, subscribe, send } = useWs();
  const [verification, setVerification] =
    useState<VerificationState>(INITIAL_VERIFICATION);
  const [regression, setRegression] =
    useState<RegressionGuardState>(INITIAL_REGRESSION);
  const [activeTab, setActiveTab] = useState<"verification" | "regression">(
    initialTab
  );

  // Listen for WS updates
  useEffect(() => {
    return subscribe((wsEvent: WsEvent) => {
      if (wsEvent.type === "verification.update") {
        setVerification((prev) => ({
          ...prev,
          ...(wsEvent.payload as Partial<VerificationState>),
        }));
        // After verification completes, show the regression panel
        const payload = wsEvent.payload as Partial<VerificationState>;
        if (
          payload.status === "passed" ||
          payload.status === "failed"
        ) {
          setRegression((prev) => ({ ...prev, isVisible: true }));
        }
      }
      if (wsEvent.type === "regression.result") {
        setRegression((prev) => ({
          ...prev,
          ...(wsEvent.payload as Partial<RegressionGuardState>),
        }));
      }
    });
  }, [subscribe]);

  async function handleRunVerification() {
    setVerification((prev) => ({
      ...prev,
      status: "running",
      logLines: [],
    }));
    send({ type: "run_verification", session_id: sessionId });

    // Fallback REST kick-off if WS send is not enough
    try {
      await fetch(`${BACKEND_URL}/session/${sessionId}/verify`, {
        method: "POST",
      });
    } catch {
      // WS updates will drive state, REST is best-effort
    }
  }

  async function handleGenerateRegressionTest() {
    setRegression((prev) => ({ ...prev, status: "generating" }));
    send({ type: "generate_regression_test", session_id: sessionId });

    try {
      await fetch(`${BACKEND_URL}/session/${sessionId}/regression`, {
        method: "POST",
      });
    } catch {
      /* handled via WS */
    }
  }

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
          verification · session: {sessionId}
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
      </nav>

      <main className="flex flex-col flex-1 w-full max-w-[760px] mx-auto px-6 py-8 gap-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-h2 text-text">Failure Verification</h1>
          {verification.status === "idle" && (
            <Button
              label="Run verification"
              variant="primary"
              onClick={handleRunVerification}
            />
          )}
        </div>

        {/* Tab strip */}
        <div className="flex gap-0 border-b border-[rgba(140,138,130,0.14)]">
          {(["verification", "regression"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                "px-4 py-2 font-mono text-[12px] transition-colors border-b-2 -mb-[1px]",
                activeTab === tab
                  ? "border-text text-text"
                  : "border-transparent text-text-dim hover:text-text",
              ].join(" ")}
              aria-current={activeTab === tab ? "page" : undefined}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "verification" && (
          <VerificationPanel state={verification} />
        )}

        {activeTab === "regression" && (
          <RegressionGuardPanel
            state={regression}
            onGenerate={handleGenerateRegressionTest}
          />
        )}
      </main>
    </div>
  );
}

// ── Page ──

export default function VerificationPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { sessionId } = use(params);
  const { tab } = use(searchParams);

  return (
    <WsProvider sessionId={sessionId}>
      <VerificationInner
        sessionId={sessionId}
        initialTab={tab === "regression" ? "regression" : "verification"}
      />
    </WsProvider>
  );
}
