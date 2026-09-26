"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusLine } from "@/components/shared/StatusLine";
import { Button } from "@/components/shared/Button";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

// ── Demo scenarios (DRD §4.1 — named, plain-language descriptions) ──

interface DemoScenario {
  id: string;
  name: string;
  description: string;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "node-version-mismatch",
    name: "Node version mismatch",
    description:
      "Agent installs dependencies under Node 20, CI runs under Node 18. Tests fail on optional chaining syntax. Traces the mismatch through the dependency tree.",
  },
  {
    id: "env-var-missing",
    name: "Missing environment variable",
    description:
      "A database URL env var is present locally but absent in CI. Three integration tests time out silently rather than erroring. Diagnoses the missing binding.",
  },
  {
    id: "transitive-dep-break",
    name: "Transitive dependency break",
    description:
      "A patch release of a transitive dependency changes a default export. Agent's auto-install picks the new version; build succeeds but runtime crashes.",
  },
];

// ── Recent session row shape ──

interface RecentSession {
  id: string;
  timestamp: string;
  outcome: "confirmed" | "pending" | "failed";
  summary: string;
}

// ── Health check ──

type BackendStatus = "checking" | "responding" | "error";

async function checkHealth(): Promise<{ status: BackendStatus; latencyMs?: number }> {
  const t0 = Date.now();
  try {
    const res = await fetch(`${BACKEND_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { status: "error" };
    return { status: "responding", latencyMs: Date.now() - t0 };
  } catch {
    return { status: "error" };
  }
}

// ── Dashboard Page ──

export default function DashboardPage() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");
  const [latencyMs, setLatencyMs] = useState<number | undefined>();
  const [recentSessions] = useState<RecentSession[]>([]);
  const [launching, setLaunching] = useState<string | null>(null);

  useEffect(() => {
    checkHealth().then(({ status, latencyMs }) => {
      setBackendStatus(status);
      setLatencyMs(latencyMs);
    });
  }, []);

  async function handleLaunchScenario(scenarioId: string) {
    setLaunching(scenarioId);
    try {
      const res = await fetch(`${BACKEND_URL}/demo/${scenarioId}`, {
        method: "POST",
      });
      if (res.ok) {
        const { session_id } = (await res.json()) as { session_id: string };
        window.location.href = `/diagnosis/${session_id}`;
      } else {
        setLaunching(null);
      }
    } catch {
      setLaunching(null);
    }
  }

  const OUTCOME_LABEL: Record<RecentSession["outcome"], string> = {
    confirmed: "confirmed",
    pending: "pending",
    failed: "failed",
  };
  const OUTCOME_COLOR: Record<RecentSession["outcome"], string> = {
    confirmed: "text-confirmed",
    pending: "text-pending",
    failed: "text-divergent",
  };

  return (
    <main className="flex flex-col flex-1 w-full max-w-[760px] mx-auto px-6 py-12 gap-12">
      {/* ── Header ── */}
      <header>
        <h1 className="font-serif text-[32px] font-medium text-text leading-tight">
          AgentDoctor
        </h1>
        <p className="font-sans text-[14px] text-text-dim mt-2">
          Diagnose the cause, not just the symptom.
        </p>
      </header>

      {/* ── Backend health (DRD §3.6 / §4.1) ── */}
      <section aria-label="Backend health">
        <div className="rule-line pt-4">
          <StatusLine
            label="Backend"
            status={backendStatus}
            latencyMs={latencyMs}
          />
        </div>
      </section>

      {/* ── Demo scenario picker (DRD §4.1) ── */}
      <section aria-label="Demo scenarios">
        <h2 className="text-h3 text-text mb-4">Run a demo scenario</h2>
        <p className="font-sans text-[13px] text-text-dim mb-6">
          Select a scripted failure below. No repository or account needed — the
          scenario runs in an isolated container and produces a full diagnostic
          report.
        </p>

        <div className="flex flex-col divide-y divide-[rgba(140,138,130,0.14)]">
          {DEMO_SCENARIOS.map((scenario) => (
            <div
              key={scenario.id}
              className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 py-5"
            >
              <div className="flex flex-col gap-1 flex-1">
                <span className="font-sans text-[14px] font-medium text-text">
                  {scenario.name}
                </span>
                <span className="font-sans text-[13px] text-text-dim leading-relaxed">
                  {scenario.description}
                </span>
              </div>

              <Button
                label={
                  launching === scenario.id
                    ? "Starting…"
                    : "Run this scenario"
                }
                variant="secondary"
                surface="dark"
                disabled={launching !== null || backendStatus !== "responding"}
                onClick={() => handleLaunchScenario(scenario.id)}
                aria-busy={launching === scenario.id}
                className="shrink-0 self-start sm:self-center"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Recent sessions (DRD §4.1 — one line per session, no card grid) ── */}
      {recentSessions.length > 0 && (
        <section aria-label="Recent sessions">
          <h2 className="text-h3 text-text mb-4">Recent sessions</h2>
          <div className="flex flex-col divide-y divide-[rgba(140,138,130,0.14)]">
            {recentSessions.map((session) => (
              <Link
                key={session.id}
                href={`/diagnosis/${session.id}`}
                className="flex items-baseline gap-4 py-3 hover:bg-ink-raised/40 px-2 -mx-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pending"
              >
                <span className="font-mono text-[11px] text-text-dim shrink-0">
                  {session.timestamp}
                </span>
                <span
                  className={`font-mono text-[11px] shrink-0 ${OUTCOME_COLOR[session.outcome]}`}
                >
                  {OUTCOME_LABEL[session.outcome]}
                </span>
                <span className="font-sans text-[13px] text-text flex-1 truncate">
                  {session.summary}
                </span>
                <span className="font-mono text-[11px] text-text-dim shrink-0">
                  {session.id}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
