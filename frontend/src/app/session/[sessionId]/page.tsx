"use client"

import { use } from "react"
import { useSession } from "@/lib/useSession"
import type { TimelineEventItem } from "@/lib/api"

export default function CheckupPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const sess = useSession(sessionId)

  // ── Demo mode ─────────────────────────────────────────────────────────────
  if (sess.mode === "demo" && sess.scenario) {
    const s = sess.scenario
    return (
      <CheckupLayout
        activeFailure={s.activeFailure}
        ciStatus={s.ciStatus}
        testSummary={s.testSummary}
        runtime={s.runtime}
        deps={s.deps}
        services={s.services}
        sessionId={sessionId}
        mode="demo"
      />
    )
  }

  // ── Live mode ─────────────────────────────────────────────────────────────
  const { timeline, loadingTimeline } = sess

  // Derive a live summary from the timeline events
  const events      = timeline?.events ?? []
  const failEvents  = events.filter(e => e.severity === "error" || e.severity === "critical")
  const lastFail    = failEvents[failEvents.length - 1]
  const ciEvent     = events.find(e => e.event_type === "ci_result")
  const ciPayload   = ciEvent?.payload as Record<string, unknown> | undefined
  const ciStatus    = ciPayload?.conclusion === "failure" ? "failing"
                    : ciPayload?.conclusion === "success" ? "passing" : "running"
  const testEvent   = events.find(e => e.event_type === "test_result")
  const testPayload = testEvent?.payload as Record<string, unknown> | undefined
  const envEvent    = events.find(e => e.event_type === "env_snapshot")
  const envPayload  = envEvent?.payload as Record<string, unknown> | undefined
  const runtime     = envPayload?.runtime as { language?: string; version?: string } | undefined

  // Deps from env_snapshot
  const packages = (envPayload?.packages as { name: string; version: string }[] | undefined) ?? []
  const deps = packages.slice(0, 6).map(p => ({ name: p.name, version: p.version, ok: true }))

  return (
    <CheckupLayout
      activeFailure={lastFail?.summary ?? (loadingTimeline ? "Loading…" : "No failures detected")}
      ciStatus={ciStatus as "passing" | "failing" | "running"}
      testSummary={{
        total:  Number(testPayload?.total ?? 0),
        passed: Number(testPayload?.passed ?? 0),
        failed: Number(testPayload?.failed ?? 0),
      }}
      runtime={{
        label:   `${runtime?.language ?? "Unknown"} ${runtime?.version ?? ""}`.trim(),
        version: runtime?.version ?? "",
        ok:      true,
      }}
      deps={deps}
      services={[]}
      sessionId={sessionId}
      mode="live"
      totalEvents={timeline?.total_count}
      loading={loadingTimeline}
      liveEvents={events}
    />
  )
}

// ── Shared layout (used by both demo and live) ─────────────────────────────────

function CheckupLayout({
  activeFailure, ciStatus, testSummary, runtime, deps, services,
  sessionId, mode, totalEvents, loading, liveEvents,
}: {
  activeFailure: string
  ciStatus: "passing" | "failing" | "running"
  testSummary: { total: number; passed: number; failed: number }
  runtime: { label: string; version: string; ok: boolean; expected?: string }
  deps: { name: string; version: string; ok: boolean; expected?: string }[]
  services: { name: string; status: "up" | "down" | "degraded" }[]
  sessionId: string
  mode: "demo" | "live"
  totalEvents?: number
  loading?: boolean
  liveEvents?: TimelineEventItem[]
}) {
  const hasFailure = ciStatus === "failing" || testSummary.failed > 0

  return (
    <main style={{ padding: "clamp(20px,4vw,40px) clamp(20px,4vw,48px)", maxWidth: 860 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", marginBottom: 8, fontFamily: "var(--font-mono-jb), monospace" }}>
          01 / Checkup
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)", letterSpacing: "-0.3px" }}>
            Project state
          </h1>
          <ModeBadge mode={mode} />
          {mode === "live" && totalEvents !== undefined && (
            <span style={{ fontSize: 12, color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", fontFamily: "var(--font-mono-jb), monospace" }}>
              {totalEvents} events
            </span>
          )}
        </div>
      </div>

      {/* Active failure banner */}
      {hasFailure && (
        <div style={{
          padding: "14px 18px", marginBottom: 28,
          background: "rgba(219,36,36,0.05)",
          border: "1px solid rgba(219,36,36,0.2)",
          borderRadius: 6,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#DB2424", flexShrink: 0, display: "inline-block" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#DB2424", marginBottom: 2 }}>Active failure</div>
            <div style={{ fontSize: 13, fontFamily: "var(--font-mono-jb), monospace", color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)" }}>
              {activeFailure}
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, flexShrink: 0 }}>
            <Stat label="Failed" value={testSummary.failed} color="#DB2424" />
            <Stat label="Passed" value={testSummary.passed} color="#2BAB60" />
            <Stat label="Total"  value={testSummary.total}  color="#1C2222" />
          </div>
        </div>
      )}

      {loading && (
        <div style={{ fontSize: 12, color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", marginBottom: 24, fontFamily: "var(--font-mono-jb), monospace" }}>
          Fetching session data&hellip;
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>

        {/* Runtime */}
        <Section title="Runtime">
          <Field label="Environment" mono value={runtime.label || "—"} status={runtime.ok ? "ok" : "fail"} />
          {!runtime.ok && runtime.expected && (
            <Field label="Expected" mono value={runtime.expected} status="warn" />
          )}
        </Section>

        {/* CI */}
        <Section title="CI pipeline">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <CIBadge status={ciStatus} />
            <span style={{ fontSize: 12, color: "var(--skeuo-text-inset-color)" }}>
              {ciStatus === "failing"
                ? `${testSummary.failed} test${testSummary.failed !== 1 ? "s" : ""} failing`
                : ciStatus === "passing"
                ? "All tests passing"
                : "Pipeline running"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {[
              { label: "Passed", value: testSummary.passed, color: "#2BAB60" },
              { label: "Failed", value: testSummary.failed, color: "#DB2424" },
              { label: "Total",  value: testSummary.total,  color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)" },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 10, color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontFamily: "var(--font-mono-jb), monospace", fontSize: 18, fontWeight: 700, color: s.color }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Dependencies */}
        {deps.length > 0 && (
          <Section title="Dependencies" style={{ gridColumn: "1 / -1" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {["Package", "Version", "Expected", "Status"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 12px 6px 0", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", borderBottom: "1px solid var(--skeuo-border)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deps.map(dep => (
                  <tr key={dep.name} style={{ borderBottom: "1px solid var(--skeuo-border)" }}>
                    <td style={{ padding: "9px 12px 9px 0", fontFamily: "var(--font-mono-jb), monospace", color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)", fontWeight: 500 }}>{dep.name}</td>
                    <td style={{ padding: "9px 12px 9px 0", fontFamily: "var(--font-mono-jb), monospace", color: dep.ok ? "#1C2222" : "#DB2424" }}>{dep.version}</td>
                    <td style={{ padding: "9px 12px 9px 0", fontFamily: "var(--font-mono-jb), monospace", color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)" }}>{dep.expected ?? "—"}</td>
                    <td style={{ padding: "9px 0" }}>
                      <StatusDot ok={dep.ok} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Services */}
        {services.length > 0 && (
          <Section title="Services">
            {services.map(svc => (
              <div key={svc.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--skeuo-border)" }}>
                <span style={{ fontSize: 13, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)" }}>{svc.name}</span>
                <span style={{ fontFamily: "var(--font-mono-jb), monospace", fontSize: 11, fontWeight: 600, color: svc.status === "up" ? "#2BAB60" : svc.status === "down" ? "#DB2424" : "#EC9C13" }}>
                  {svc.status}
                </span>
              </div>
            ))}
          </Section>
        )}

        {/* Live: recent events list */}
        {mode === "live" && liveEvents && liveEvents.length > 0 && (
          <Section title="Recent events" style={{ gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {liveEvents.slice(0, 8).map((ev, i) => (
                <div key={ev.id} style={{
                  display: "flex", alignItems: "baseline", gap: 14, padding: "8px 0",
                  borderBottom: i < 7 ? "1px solid #EBF2F2" : "none",
                }}>
                  <span style={{ fontFamily: "var(--font-mono-jb), monospace", fontSize: 10, color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", flexShrink: 0, width: 72 }}>
                    {new Date(ev.occurred_at).toLocaleTimeString()}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.07em",
                    color: EV_COLOR[ev.event_type] ?? "#9AABAB",
                    minWidth: 60, fontFamily: "var(--font-mono-jb), monospace",
                  }}>
                    {ev.event_type.replace("_", " ").toUpperCase()}
                  </span>
                  <span style={{ fontSize: 12, color: ev.severity === "error" || ev.severity === "critical" ? "#DB2424" : "#1C2222" }}>
                    {ev.summary ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

      </div>
    </main>
  )
}

const EV_COLOR: Record<string, string> = {
  agent_action: "#4B85BE", git_diff: "#718484", env_snapshot: "#34C1C1",
  test_result: "#EC9C13", ci_result: "#DB2424", dependency: "#EC9C13", custom: "#9AABAB",
}

function Section({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid var(--skeuo-header-border)" }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Field({ label, value, mono, status }: { label: string; value: string; mono?: boolean; status?: "ok" | "fail" | "warn" }) {
  const color = status === "fail" ? "#DB2424" : status === "warn" ? "#b87100" : "#1C2222"
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontFamily: mono ? "var(--font-mono-jb), monospace" : undefined, color, fontWeight: status ? 500 : 400 }}>
        {value}
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 10, color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono-jb), monospace", fontSize: 14, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function CIBadge({ status }: { status: "passing" | "failing" | "running" }) {
  const cfg = {
    passing: { bg: "rgba(43,171,96,0.08)",  border: "rgba(43,171,96,0.2)",   color: "#2BAB60", label: "passing" },
    failing: { bg: "rgba(219,36,36,0.07)",  border: "rgba(219,36,36,0.2)",   color: "#DB2424", label: "failing" },
    running: { bg: "rgba(236,156,19,0.07)", border: "rgba(236,156,19,0.22)", color: "#b87100", label: "running" },
  }[status]
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color, display: "inline-block" }} />
      {cfg.label}
    </span>
  )
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: ok ? "#2BAB60" : "#DB2424" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: ok ? "#2BAB60" : "#DB2424", display: "inline-block" }} />
      {ok ? "ok" : "mismatch"}
    </span>
  )
}

function ModeBadge({ mode }: { mode: "demo" | "live" }) {
  if (mode === "demo") {
    return (
      <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 3, background: "rgba(52,193,193,0.1)", border: "1px solid rgba(52,193,193,0.25)", color: "#1fa3a3", fontFamily: "var(--font-mono-jb), monospace" }}>
        demo
      </span>
    )
  }
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 3, background: "rgba(43,171,96,0.1)", border: "1px solid rgba(43,171,96,0.25)", color: "#2BAB60", fontFamily: "var(--font-mono-jb), monospace" }}>
      live
    </span>
  )
}
