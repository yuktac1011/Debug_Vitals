"use client";

import { Button } from "@/components/shared/Button";
import {
  ConfidenceState,
  type ConfidenceLevel,
} from "@/components/diagnosis/ConfidenceState";
import {
  EvidenceList,
  type EvidenceLine,
} from "@/components/diagnosis/EvidenceList";

/**
 * DRD §4.2 — single-column parchment surface.
 * Order: session id + confidence → root cause → evidence →
 *         affected components + next step → actions.
 */

export interface DiagnosisReport {
  sessionId: string;
  confidence: ConfidenceLevel;
  previousConfidence?: ConfidenceLevel;
  rootCause: string;
  evidence: EvidenceLine[];
  affectedComponents: string[];
  suggestedNextStep: string;
  /** Whether a diagnosis is confirmed — controls regression guard availability */
  isConfirmed: boolean;
}

interface ReportCardProps {
  report: DiagnosisReport;
  onRunVerification: () => void;
  onGenerateRegressionTest: () => void;
  onTraceEvent?: (timelineEventId: string) => void;
}

export function ReportCard({
  report,
  onRunVerification,
  onGenerateRegressionTest,
  onTraceEvent,
}: ReportCardProps) {
  return (
    <article
      className="surface-parchment w-full max-w-[760px] mx-auto"
      aria-label="Diagnosis Report"
    >
      {/* ── Header: session id + confidence ── */}
      <header className="px-8 pt-8 pb-6 flex items-baseline justify-between gap-4">
        <span className="font-mono text-[12px] text-text-dim">
          session:{" "}
          <span className="text-ink-on-parchment">{report.sessionId}</span>
        </span>
        <ConfidenceState
          level={report.confidence}
          previousLevel={report.previousConfidence}
        />
      </header>

      <div className="rule-line mx-8" />

      {/* ── Root cause — Display-scale serif ── */}
      <section className="px-8 py-8">
        <h1 className="text-display text-ink-on-parchment">
          {report.rootCause}
        </h1>
      </section>

      <div className="rule-line mx-8" />

      {/* ── Evidence ── */}
      <section className="px-8 py-6" aria-label="Evidence">
        <h2 className="text-h3 text-ink-on-parchment mb-4">Evidence</h2>
        <EvidenceList
          items={report.evidence}
          sessionId={report.sessionId}
          onTraceEvent={onTraceEvent}
        />
      </section>

      <div className="rule-line mx-8" />

      {/* ── Affected components + next step — side by side ── */}
      <section
        className="px-8 py-6 grid grid-cols-1 sm:grid-cols-2 gap-6"
        aria-label="Components and next step"
      >
        <div>
          <h2 className="text-h3 text-ink-on-parchment mb-3">
            Affected components
          </h2>
          <ul className="space-y-1">
            {report.affectedComponents.map((c) => (
              <li
                key={c}
                className="font-mono text-[13px] text-ink-on-parchment flex items-start gap-2"
              >
                <span className="text-text-dim select-none" aria-hidden="true">
                  —
                </span>
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-h3 text-ink-on-parchment mb-3">
            Suggested next step
          </h2>
          <p className="font-sans text-[14px] text-ink-on-parchment leading-relaxed">
            {report.suggestedNextStep}
          </p>
        </div>
      </section>

      <div className="rule-line mx-8" />

      {/* ── Actions ── */}
      <footer className="px-8 py-6 flex flex-wrap gap-3">
        <Button
          label="Run verification"
          variant="primary"
          onClick={onRunVerification}
        />
        {report.isConfirmed && (
          <Button
            label="Generate regression test"
            variant="secondary"
            onClick={onGenerateRegressionTest}
          />
        )}
      </footer>
    </article>
  );
}
