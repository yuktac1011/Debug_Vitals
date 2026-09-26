"use client";

import { ConfidenceState, type ConfidenceLevel } from "@/components/diagnosis/ConfidenceState";

/**
 * DRD §4.5 — Verification Panel.
 * 1. States the hypothesis in plain language before running.
 * 2. Live status while container executes.
 * 3. Before → after confidence delta on completion (§2.4 motion).
 */

export type VerificationStatus =
  | "idle"
  | "running"
  | "passed"
  | "failed"
  | "error";

export interface VerificationState {
  hypothesis: string;
  status: VerificationStatus;
  confidenceBefore?: ConfidenceLevel;
  confidenceAfter?: ConfidenceLevel;
  /** Live log lines streamed from the container run */
  logLines?: string[];
  errorMessage?: string;
}

const STATUS_LABEL: Record<VerificationStatus, string> = {
  idle: "waiting to run",
  running: "running…",
  passed: "passed",
  failed: "failed",
  error: "error",
};

const STATUS_COLOR: Record<VerificationStatus, string> = {
  idle: "text-text-dim",
  running: "text-pending",
  passed: "text-confirmed",
  failed: "text-divergent",
  error: "text-divergent",
};

interface VerificationPanelProps {
  state: VerificationState;
}

export function VerificationPanel({ state }: VerificationPanelProps) {
  const isDone = state.status === "passed" || state.status === "failed";
  const isRunning = state.status === "running";

  return (
    <section
      className="bg-ink-raised w-full"
      aria-label="Verification panel"
    >
      {/* Hypothesis */}
      <div className="px-6 py-5 border-b border-[rgba(140,138,130,0.14)]">
        <h2 className="text-h3 text-text mb-1">Verification</h2>
        <p className="font-sans text-[14px] text-text leading-relaxed">
          {state.hypothesis}
        </p>
      </div>

      {/* Status line */}
      <div className="px-6 py-3 border-b border-[rgba(140,138,130,0.14)] flex items-center gap-3">
        <span
          className={`font-mono text-[12px] ${STATUS_COLOR[state.status]}`}
          aria-live="polite"
          aria-atomic="true"
        >
          {isRunning && (
            <span className="inline-block animate-pulse mr-1">●</span>
          )}
          container: {STATUS_LABEL[state.status]}
        </span>
      </div>

      {/* Live log — only while running or after */}
      {state.logLines && state.logLines.length > 0 && (
        <div className="px-6 py-4 border-b border-[rgba(140,138,130,0.14)]">
          <div
            className="font-mono text-[11px] text-text-dim bg-ink overflow-y-auto max-h-48 p-3 rounded-[2px]"
            aria-label="Container log output"
            aria-live={isRunning ? "polite" : "off"}
          >
            {state.logLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      )}

      {/* Before → after confidence delta */}
      {isDone &&
        state.confidenceBefore != null &&
        state.confidenceAfter != null && (
          <div className="px-6 py-5 flex items-center gap-6">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[11px] text-text-dim">
                before
              </span>
              <ConfidenceState level={state.confidenceBefore} />
            </div>

            <span
              className="font-mono text-[18px] text-text-dim"
              aria-hidden="true"
            >
              →
            </span>

            <div className="flex flex-col gap-1">
              <span className="font-mono text-[11px] text-text-dim">after</span>
              <ConfidenceState
                level={state.confidenceAfter}
                previousLevel={state.confidenceBefore}
              />
            </div>

            <span className="sr-only">
              Confidence changed from {state.confidenceBefore} to{" "}
              {state.confidenceAfter}
            </span>
          </div>
        )}

      {/* Error message */}
      {state.status === "error" && state.errorMessage && (
        <div className="px-6 py-4">
          <p className="font-mono text-[12px] text-divergent">
            {state.errorMessage}
          </p>
        </div>
      )}
    </section>
  );
}
