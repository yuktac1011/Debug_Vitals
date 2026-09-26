"use client";

import { Button } from "@/components/shared/Button";

/**
 * DRD §4.6 — Regression Guard Panel.
 * Shown only after a confirmed diagnosis.
 * One action: "Generate test for this failure."
 * Displays generated test in mono + pass/fail result.
 */

export type RegressionTestStatus = "idle" | "generating" | "running" | "passed" | "failed";

export interface RegressionGuardState {
  isVisible: boolean;
  status: RegressionTestStatus;
  generatedTestCode?: string;
  testResult?: "passed" | "failed";
}

const STATUS_LABEL: Record<RegressionTestStatus, string> = {
  idle: "",
  generating: "generating…",
  running: "running…",
  passed: "passed",
  failed: "failed",
};

const STATUS_COLOR: Record<RegressionTestStatus, string> = {
  idle: "text-text-dim",
  generating: "text-pending",
  running: "text-pending",
  passed: "text-confirmed",
  failed: "text-divergent",
};

interface RegressionGuardPanelProps {
  state: RegressionGuardState;
  onGenerate: () => void;
}

export function RegressionGuardPanel({
  state,
  onGenerate,
}: RegressionGuardPanelProps) {
  if (!state.isVisible) return null;

  const canGenerate =
    state.status === "idle" ||
    state.status === "passed" ||
    state.status === "failed";
  const isActive = state.status === "generating" || state.status === "running";

  return (
    <section
      className="bg-ink-raised w-full"
      aria-label="Regression guard panel"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-[rgba(140,138,130,0.14)] flex items-center justify-between gap-4">
        <h2 className="text-h3 text-text">Regression Guard</h2>
        <Button
          label="Generate test for this failure"
          variant="primary"
          surface="dark"
          onClick={onGenerate}
          disabled={!canGenerate || isActive}
          aria-busy={isActive}
        />
      </div>

      {/* Status line */}
      {state.status !== "idle" && (
        <div className="px-6 py-3 border-b border-[rgba(140,138,130,0.14)]">
          <span
            className={`font-mono text-[12px] ${STATUS_COLOR[state.status]}`}
            aria-live="polite"
            aria-atomic="true"
          >
            {isActive && (
              <span className="inline-block animate-pulse mr-1">●</span>
            )}
            {STATUS_LABEL[state.status]}
          </span>
        </div>
      )}

      {/* Generated test code — real code, not a description (DRD §4.6) */}
      {state.generatedTestCode && (
        <div className="px-6 py-5 border-b border-[rgba(140,138,130,0.14)]">
          <h3 className="font-mono text-[11px] text-text-dim mb-3 uppercase tracking-wide">
            generated test
          </h3>
          <pre className="font-mono text-[12px] text-text bg-ink overflow-x-auto p-4 rounded-[2px] whitespace-pre-wrap leading-relaxed">
            {state.generatedTestCode}
          </pre>
        </div>
      )}

      {/* Pass/fail result */}
      {state.testResult && (
        <div className="px-6 py-4">
          <span
            className={`font-mono text-[13px] ${
              state.testResult === "passed" ? "text-confirmed" : "text-divergent"
            }`}
            aria-label={`Test result: ${state.testResult}`}
          >
            test result:{" "}
            <strong>{state.testResult}</strong>
          </span>
        </div>
      )}
    </section>
  );
}
