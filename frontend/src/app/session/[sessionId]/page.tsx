"use client"

import { use } from "react"
import { DEMO_SCENARIOS, DEFAULT_SCENARIO, type ScenarioId } from "@/lib/demoData"

export default function CheckupPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const scenarioId    = sessionId.replace("demo-", "") as ScenarioId
  const s             = DEMO_SCENARIOS[scenarioId] ?? DEMO_SCENARIOS[DEFAULT_SCENARIO]

  return (
    <main style={{ padding: "clamp(20px,4vw,40px) clamp(20px,4vw,48px)", maxWidth: 860 }}>

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9AABAB", marginBottom: 8, fontFamily: "var(--font-mono-jb), monospace" }}>
          01 / Checkup
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1C2222", letterSpacing: "-0.3px", marginBottom: 6 }}>
          Project state
        </h1>
        <p style={{ fontSize: 13, color: "#718484" }}>
          Current runtime, dependencies, services, and active failure.
        </p>
      </div>

      {/* Active failure banner */}
      <div style={{
        padding: "14px 18px",
        background: "rgba(219,36,36,0.05)",
        border: "1px solid rgba(219,36,36,0.2)",
        borderRadius: 6,
        marginBottom: 32,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#DB2424", flexShrink: 0, display: "inline-block" }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#DB2424", marginBottom: 2 }}>Active failure</div>
          <div style={{ fontSize: 13, fontFamily: "var(--font-mono-jb), monospace", color: "#1C2222" }}>
            {s.activeFailure}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#9AABAB", marginBottom: 2 }}>Tests</div>
            <div style={{ fontFamily: "var(--font-mono-jb), monospace", fontSize: 12, color: "#1C2222" }}>
              <span style={{ color: "#DB2424", fontWeight: 600 }}>{s.testSummary.failed} failed</span>
              {" / "}{s.testSummary.total} total
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#9AABAB", marginBottom: 2 }}>CI</div>
            <CIBadge status={s.ciStatus} />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

        {/* Runtime */}
        <Section title="Runtime">
          <Field label="Language / runtime" mono value={s.runtime.label + " " + s.runtime.version}
            status={s.runtime.ok ? "ok" : "fail"}
          />
          {!s.runtime.ok && s.runtime.expected && (
            <Field label="Expected (CI)" mono value={s.runtime.expected} status="warn" />
          )}
        </Section>

        {/* CI */}
        <Section title="CI pipeline">
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
            <CIBadge status={s.ciStatus} />
            <span style={{ fontSize: 12, color: "#718484" }}>
              {s.ciStatus === "failing" ? `${s.testSummary.failed} tests failing` : "All tests passing"}
            </span>
          </div>
          <div style={{ borderTop: "1px solid #EBF2F2", paddingTop: 10, marginTop: 4 }}>
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { label: "Passed", value: s.testSummary.passed, color: "#2BAB60" },
                { label: "Failed", value: s.testSummary.failed, color: "#DB2424" },
                { label: "Total",  value: s.testSummary.total,  color: "#1C2222" },
              ].map(stat => (
                <div key={stat.label}>
                  <div style={{ fontSize: 10, color: "#9AABAB", marginBottom: 3 }}>{stat.label}</div>
                  <div style={{ fontFamily: "var(--font-mono-jb), monospace", fontSize: 16, fontWeight: 600, color: stat.color }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Dependencies */}
        <Section title="Dependencies" style={{ gridColumn: "1 / -1" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Package", "Version", "Expected", "Status"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 12px 6px 0", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9AABAB", borderBottom: "1px solid #EBF2F2" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.deps.map((dep) => (
                <tr key={dep.name} style={{ borderBottom: "1px solid #EBF2F2" }}>
                  <td style={{ padding: "9px 12px 9px 0", fontFamily: "var(--font-mono-jb), monospace", color: "#1C2222", fontWeight: 500 }}>
                    {dep.name}
                  </td>
                  <td style={{ padding: "9px 12px 9px 0", fontFamily: "var(--font-mono-jb), monospace", color: dep.ok ? "#1C2222" : "#DB2424" }}>
                    {dep.version}
                  </td>
                  <td style={{ padding: "9px 12px 9px 0", fontFamily: "var(--font-mono-jb), monospace", color: "#718484" }}>
                    {dep.expected ?? <span style={{ color: "#D8E4E4" }}>—</span>}
                  </td>
                  <td style={{ padding: "9px 0" }}>
                    <StatusDot ok={dep.ok} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Services */}
        <Section title="Services">
          {s.services.map((svc) => (
            <div key={svc.name} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 0", borderBottom: "1px solid #EBF2F2",
            }}>
              <span style={{ fontSize: 13, color: "#1C2222" }}>{svc.name}</span>
              <span style={{
                fontFamily: "var(--font-mono-jb), monospace",
                fontSize: 11, fontWeight: 600,
                color: svc.status === "up" ? "#2BAB60" : svc.status === "down" ? "#DB2424" : "#EC9C13",
              }}>
                {svc.status}
              </span>
            </div>
          ))}
        </Section>

      </div>
    </main>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children, style }: {
  title: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div style={{ ...style }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
        color: "#9AABAB", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #D8E4E4",
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Field({ label, value, mono, status }: {
  label: string
  value: string
  mono?: boolean
  status?: "ok" | "fail" | "warn"
}) {
  const color = status === "fail" ? "#DB2424" : status === "warn" ? "#b87100" : "#1C2222"
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: "#9AABAB", marginBottom: 3 }}>{label}</div>
      <div style={{
        fontSize: 13,
        fontFamily: mono ? "var(--font-mono-jb), monospace" : undefined,
        color,
        fontWeight: status ? 500 : 400,
      }}>
        {value}
      </div>
    </div>
  )
}

function CIBadge({ status }: { status: "passing" | "failing" | "running" }) {
  const cfg = {
    passing: { bg: "rgba(43,171,96,0.08)",  border: "rgba(43,171,96,0.2)",  color: "#2BAB60", label: "passing" },
    failing: { bg: "rgba(219,36,36,0.07)",  border: "rgba(219,36,36,0.2)",  color: "#DB2424", label: "failing" },
    running: { bg: "rgba(236,156,19,0.07)", border: "rgba(236,156,19,0.22)", color: "#b87100", label: "running" },
  }[status]
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color, display: "inline-block" }} />
      {cfg.label}
    </span>
  )
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, fontWeight: 600,
      color: ok ? "#2BAB60" : "#DB2424",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: ok ? "#2BAB60" : "#DB2424", display: "inline-block" }} />
      {ok ? "ok" : "mismatch"}
    </span>
  )
}
