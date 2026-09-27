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
      activeFailure={lastFail?.summary ?? (loadingTimeline ? "Scanning live system…" : "No active failures detected")}
      ciStatus={ciStatus as "passing" | "failing" | "running"}
      testSummary={{
        total:  Number(testPayload?.total ?? 0),
        passed: Number(testPayload?.passed ?? 0),
        failed: Number(testPayload?.failed ?? 0),
      }}
      runtime={{
        label:   `${runtime?.language ?? "Python/Node Environment"} ${runtime?.version ?? ""}`.trim(),
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
    <main className="animate-float-in">

      {/* Header */}
      <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#34C1C1", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 6 }}>
          01 / System Health Scan
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1C2222", letterSpacing: "-0.5px" }}>
            Project Checkup & Environment State
          </h1>
          <ModeBadge mode={mode} />
        </div>
      </div>

      {/* Non-Technical Info Banner */}
      <div className="info-callout" style={{ marginBottom: 28 }}>
        <div className="info-callout-icon">i</div>
        <div>
          <strong>What is Checkup?</strong> This step scans your active runtime version, installed packages, and CI test status. It highlights any environment mismatches before you waste time debugging the wrong code.
        </div>
      </div>

      {/* Active failure banner */}
      {hasFailure ? (
        <div style={{
          padding: "20px 24px", marginBottom: 32,
          background: "rgba(219,36,36,0.06)",
          border: "1px solid rgba(219,36,36,0.3)",
          borderRadius: "var(--radius-sm)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 20, flexWrap: "wrap",
        }} className="animate-pulse-error">
          <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 260 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#DB2424", flexShrink: 0, display: "inline-block" }} className="pulse-dot" />
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#DB2424", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                Active System Failure Detected
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1C2222", fontFamily: "var(--font-mono)" }}>
                {activeFailure}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, flexShrink: 0, background: "rgba(255,255,255,0.7)", padding: "8px 16px", borderRadius: 8 }}>
            <Stat label="Failed Tests" value={testSummary.failed} color="#DB2424" />
            <Stat label="Passed Tests" value={testSummary.passed} color="#2BAB60" />
            <Stat label="Total Run"     value={testSummary.total}  color="#1C2222" />
          </div>
        </div>
      ) : (
        <div style={{
          padding: "16px 20px", marginBottom: 28,
          background: "rgba(43,171,96,0.06)",
          border: "1px solid rgba(43,171,96,0.25)",
          borderRadius: "var(--radius-sm)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span className="dot dot-ok pulse-dot" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1e7d44" }}>
            All system checks passing — No active environment errors.
          </span>
        </div>
      )}

      {loading && (
        <div style={{ marginBottom: 28 }}>
          <div className="shimmer-loader" style={{ height: 60, marginBottom: 12 }} />
          <div className="shimmer-loader" style={{ height: 120 }} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>

        {/* Runtime Section */}
        <Section title="Runtime & Language Environment" icon="⚡">
          <div className="glass-card" style={{ padding: "18px 20px" }}>
            <Field label="Detected Environment" mono value={runtime.label || "System Default"} status={runtime.ok ? "ok" : "fail"} />
            {!runtime.ok && runtime.expected && (
              <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(236,156,19,0.1)", border: "1px solid rgba(236,156,19,0.3)", borderRadius: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9c5e00" }}>⚠️ Version Mismatch</div>
                <div style={{ fontSize: 12, color: "#1C2222", marginTop: 2 }}>
                  CI Expected: <code>{runtime.expected}</code> vs Found: <code>{runtime.version}</code>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* CI Pipeline Section */}
        <Section title="CI/CD Pipeline Status" icon="🔄">
          <div className="glass-card" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <CIBadge status={ciStatus} />
              <span style={{ fontSize: 12, color: "#636e72" }}>
                {ciStatus === "failing"
                  ? `${testSummary.failed} failing assertion${testSummary.failed !== 1 ? "s" : ""}`
                  : ciStatus === "passing"
                  ? "All test suites passed"
                  : "Pipeline running"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 20, paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              {[
                { label: "Passed", value: testSummary.passed, color: "#2BAB60" },
                { label: "Failed", value: testSummary.failed, color: "#DB2424" },
                { label: "Total Tests", value: testSummary.total, color: "#1C2222" },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 11, color: "#718484", marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: s.color }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Dependencies Section */}
        {deps.length > 0 && (
          <Section title="Key Project Dependencies" icon="📦" style={{ gridColumn: "1 / -1" }}>
            <div className="glass-card" style={{ padding: "16px 20px", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Package Name", "Current Version", "Expected / Compatible", "Status"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 12px 8px 0", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9AABAB", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deps.map(dep => (
                    <tr key={dep.name} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                      <td style={{ padding: "10px 12px 10px 0", fontFamily: "var(--font-mono)", color: "#1C2222", fontWeight: 600 }}>{dep.name}</td>
                      <td style={{ padding: "10px 12px 10px 0", fontFamily: "var(--font-mono)", color: dep.ok ? "#1C2222" : "#DB2424" }}>{dep.version}</td>
                      <td style={{ padding: "10px 12px 10px 0", fontFamily: "var(--font-mono)", color: "#718484" }}>{dep.expected ?? "Match"}</td>
                      <td style={{ padding: "10px 0" }}>
                        <StatusDot ok={dep.ok} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* Services Section */}
        {services.length > 0 && (
          <Section title="Connected Microservices" icon="🔌">
            <div className="glass-card" style={{ padding: "16px 20px" }}>
              {services.map(svc => (
                <div key={svc.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1C2222" }}>{svc.name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: svc.status === "up" ? "#2BAB60" : svc.status === "down" ? "#DB2424" : "#EC9C13" }}>
                    {svc.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Live: recent events list */}
        {mode === "live" && liveEvents && liveEvents.length > 0 && (
          <Section title="Live Signal Stream" icon="🛰️" style={{ gridColumn: "1 / -1" }}>
            <div className="glass-card" style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {liveEvents.slice(0, 8).map((ev) => (
                  <div key={ev.id} style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "8px 12px",
                    background: "rgba(255,255,255,0.5)", borderRadius: 6,
                    borderLeft: `3px solid ${EV_COLOR[ev.event_type] ?? "#9AABAB"}`,
                  }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#718484", flexShrink: 0, width: 80 }}>
                      {new Date(ev.occurred_at).toLocaleTimeString()}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                      color: EV_COLOR[ev.event_type] ?? "#9AABAB",
                      minWidth: 90, fontFamily: "var(--font-mono)",
                    }}>
                      {ev.event_type.replace("_", " ").toUpperCase()}
                    </span>
                    <span style={{ fontSize: 13, color: ev.severity === "error" || ev.severity === "critical" ? "#DB2424" : "#1C2222", fontWeight: 500 }}>
                      {ev.summary ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
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

function Section({ title, icon, children, style }: { title: string; icon?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1C2222", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      {children}
    </div>
  )
}

function Field({ label, value, mono, status }: { label: string; value: string; mono?: boolean; status?: "ok" | "fail" | "warn" }) {
  const color = status === "fail" ? "#DB2424" : status === "warn" ? "#b87100" : "#1C2222"
  return (
    <div>
      <div style={{ fontSize: 11, color: "#718484", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontFamily: mono ? "var(--font-mono)" : undefined, color, fontWeight: 600 }}>
        {value}
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 10, color: "#718484", marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 800, color }}>{value}</div>
    </div>
  )
}

function CIBadge({ status }: { status: "passing" | "failing" | "running" }) {
  const cfg = {
    passing: { badge: "badge-success", dot: "dot-ok", label: "Pipeline Passing" },
    failing: { badge: "badge-error",   dot: "dot-error", label: "Pipeline Failing" },
    running: { badge: "badge-warning", dot: "dot-warn", label: "Pipeline Running" },
  }[status]
  return (
    <span className={`badge ${cfg.badge}`}>
      <span className={`dot ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`badge ${ok ? "badge-success" : "badge-error"}`}>
      <span className={`dot ${ok ? "dot-ok" : "dot-error"}`} />
      {ok ? "Compatible" : "Mismatch"}
    </span>
  )
}

function ModeBadge({ mode }: { mode: "demo" | "live" }) {
  if (mode === "demo") {
    return (
      <span className="badge badge-primary">
        Interactive Demo
      </span>
    )
  }
  return (
    <span className="badge badge-success">
      Live Session
    </span>
  )
}
