"use client";

/**
 * DRD §3.6 — plain status line in mono ("Backend: responding, 42ms").
 * Never a colored dot alone.
 */
interface StatusLineProps {
  label: string;
  status: "responding" | "error" | "checking";
  latencyMs?: number;
}

export function StatusLine({ label, status, latencyMs }: StatusLineProps) {
  const statusText: Record<StatusLineProps["status"], string> = {
    responding: "responding",
    error: "unreachable",
    checking: "checking…",
  };

  return (
    <span className="font-mono text-[12px] text-text-dim">
      {label}:{" "}
      <span
        className={
          status === "responding"
            ? "text-confirmed"
            : status === "error"
              ? "text-divergent"
              : "text-pending"
        }
      >
        {statusText[status]}
        {status === "responding" && latencyMs != null
          ? `, ${latencyMs}ms`
          : ""}
      </span>
    </span>
  );
}
