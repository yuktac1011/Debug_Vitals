"use client"

import { use, useState } from "react"
import { useSession } from "@/lib/useSession"
import type { RegressionGuardRequest, RegressionGuardResponse, RegressionTestItem } from "@/lib/api"

const DOCKER_IMAGES = [
  "python:3.11-slim",
  "python:3.10-slim",
  "python:3.9-slim",
  "node:18-alpine",
  "node:20-alpine",
  "ubuntu:22.04",
]

const LANGUAGES = ["python", "javascript", "typescript", "go", "java", "ruby"]

// ── Demo view ─────────────────────────────────────────────────────────────────

function DemoView({ scenario }: { scenario: NonNullable<ReturnType<typeof useSession>["scenario"]> }) {
  const [generated, setGenerated] = useState(false)

  if (!scenario.verified) {
    return (
      <div style={{ padding: "24px", background: "rgba(236,156,19,0.08)", border: "1px solid rgba(236,156,19,0.3)", borderRadius: "var(--radius-sm)", color: "#9c5e00", fontSize: 13, fontWeight: 600 }}>
        ⚠️ Regression Guard is available after the diagnosis is verified. Complete Step 04 (Verification) first.
      </div>
    )
  }

  return (
    <>
      {/* Confirmed banner */}
      <ConfirmedBanner />

      {/* Root cause reminder */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Diagnosed Root Cause</SectionLabel>
        <div className="glass-card" style={{ padding: "18px 22px", fontSize: 14, color: "#1C2222", lineHeight: 1.55, fontWeight: 600, borderLeft: "4px solid #2BAB60" }}>
          {scenario.rootCause}
        </div>
      </div>

      {/* Generate button / code */}
      {!generated ? (
        <button className="btn btn-primary" onClick={() => setGenerated(true)}>
          ✨ Generate Targeted Regression Test
        </button>
      ) : (
        <TestCodeBlock code={scenario.regressionTest} />
      )}
    </>
  )
}

// ── Live form ─────────────────────────────────────────────────────────────────

function LiveForm({
  sessionId,
  diagnosisId,
  loading,
  result,
  error,
  onSubmit,
}: {
  sessionId:    string
  diagnosisId?: string
  loading:      boolean
  result?:      RegressionGuardResponse
  error?:       string
  onSubmit:     (req: RegressionGuardRequest) => void
}) {
  const [diagId,       setDiagId]       = useState(diagnosisId ?? "")
  const [topN,         setTopN]         = useState(3)
  const [image,        setImage]        = useState(DOCKER_IMAGES[0])
  const [language,     setLanguage]     = useState("python")
  const [runNow,       setRunNow]       = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!diagId.trim()) return
    const req: RegressionGuardRequest = {
      diagnosis_id:    diagId.trim(),
      top_n_causes:    topN,
      docker_image:    image,
      language,
      run_immediately: runNow,
    }
    onSubmit(req)
  }

  return (
    <div>
      {!diagnosisId && (
        <div style={{ padding: "14px 18px", background: "rgba(236,156,19,0.08)", border: "1px solid rgba(236,156,19,0.3)", borderRadius: 6, color: "#9c5e00", fontSize: 13, marginBottom: 20 }}>
          💡 Run <strong>Step 02 (Diagnosis)</strong> first to get a Diagnosis ID, or paste one below manually.
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: "24px 28px", marginBottom: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 24 }}>

          <FieldRow label="Diagnosis Reference ID" hint="Required — links test code to root cause">
            <input
              value={diagId}
              onChange={(e) => setDiagId(e.target.value)}
              placeholder="Paste Diagnosis ID from Step 02"
              required
              style={inputStyle}
            />
          </FieldRow>

          <FieldRow label="Target Root Causes to Cover" hint="Generates tests for top N causes">
            <input
              type="number"
              min={1} max={10}
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              style={{ ...inputStyle, width: 80 }}
            />
          </FieldRow>

          <FieldRow label="Programming Language & Framework" hint="Test code syntax style">
            <select value={language} onChange={(e) => setLanguage(e.target.value)} style={inputStyle}>
              {LANGUAGES.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>
          </FieldRow>

          <FieldRow label="Docker Container Environment" hint="Used if running tests immediately">
            <select value={image} onChange={(e) => setImage(e.target.value)} style={inputStyle}>
              {DOCKER_IMAGES.map((img) => <option key={img} value={img}>{img}</option>)}
            </select>
          </FieldRow>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={runNow}
              onChange={(e) => setRunNow(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1C2222" }}>Run generated test immediately inside sandbox container</span>
          </label>

        </div>

        {error && (
          <div style={{ padding: "12px 16px", background: "rgba(219,36,36,0.08)", border: "1px solid rgba(219,36,36,0.3)", borderRadius: 6, color: "#DB2424", fontSize: 13, fontWeight: 600, marginBottom: 18 }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading || !diagId.trim()}>
          {loading ? "Generating Targeted Regression Tests…" : "✨ Generate Regression Test Code"}
        </button>
      </form>

      {result && <RegressionResult result={result} />}

      {/* Method note */}
      <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 20, marginTop: 32 }}>
        <SectionLabel>Regression Guard Objective</SectionLabel>
        <p style={{ fontSize: 13, color: "#636e72", lineHeight: 1.65 }}>
          Regression Guard is intentionally scoped to generate <strong>one targeted test for the exact diagnosed failure gap</strong>. It locks in your fix so AI agents or developer commits cannot re-introduce the same bug in the future.
        </p>
      </div>
    </div>
  )
}

function RegressionResult({ result }: { result: RegressionGuardResponse }) {
  return (
    <div className="glass-card" style={{ padding: "24px 28px", marginTop: 28 }}>
      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 24 }}>
        <MetaCell label="Tests Generated" value={String(result.tests_generated)} />
        <MetaCell label="Executed Runs"   value={String(result.tests_run)} />
        <MetaCell label="Passed Runs"     value={String(result.tests_passed)} accent="#2BAB60" />
        <MetaCell label="Failed Runs"     value={String(result.tests_failed)} accent={result.tests_failed > 0 ? "#DB2424" : undefined} />
      </div>

      {/* Individual tests */}
      {result.tests.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {result.tests.map((t) => (
            <TestCard key={t.id} test={t} />
          ))}
        </div>
      )}
    </div>
  )
}

function TestCard({ test }: { test: RegressionTestItem }) {
  const [open, setOpen] = useState(true)
  const statusColor = test.run_status === "passed" ? "#2BAB60"
    : test.run_status === "failed" ? "#DB2424"
    : test.generation_status === "completed" ? "#4B85BE"
    : "#9AABAB"

  return (
    <div style={{ padding: "18px 20px", background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, boxShadow: "var(--shadow-neo-sm)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: test.test_code ? 12 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "#1C2222", wordBreak: "break-all" }}>
            {test.target_file_path ?? `test_regression_${test.id.slice(0, 8)}.py`}
          </span>
          <span className="badge badge-primary" style={{ fontSize: 10 }}>{test.run_status ?? test.generation_status}</span>
        </div>
        {test.test_code && (
          <button
            onClick={() => setOpen(!open)}
            className="btn btn-sm btn-ghost"
          >
            {open ? "Hide Code ▲" : "View Code ▼"}
          </button>
        )}
      </div>

      {open && test.test_code && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
            <button
              onClick={() => navigator.clipboard.writeText(test.test_code!)}
              className="btn btn-sm btn-secondary"
            >📋 Copy Test Code</button>
          </div>
          <pre className="code-block" style={{ margin: 0, maxHeight: 320 }}>
            {test.test_code}
          </pre>
        </div>
      )}
      {test.run_output && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#718484", marginBottom: 4 }}>Test Execution Logs</div>
          <pre className="code-block" style={{ color: "#a0aec0", fontSize: 11, maxHeight: 140, margin: 0 }}>
            {test.run_output}
          </pre>
        </div>
      )}
    </div>
  )
}

// ── Shared ────────────────────────────────────────────────────────────────────

function ConfirmedBanner() {
  return (
    <div style={{ padding: "16px 22px", background: "rgba(43,171,96,0.08)", border: "1px solid rgba(43,171,96,0.3)", borderRadius: "var(--radius-sm)", marginBottom: 28, display: "flex", alignItems: "center", gap: 14 }}>
      <span className="dot dot-ok pulse-dot" />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e7d44", marginBottom: 2 }}>Step 04 Verification Confirmed</div>
        <div style={{ fontSize: 12, color: "#636e72" }}>Hypothesis empirically verified. Regression Guard will lock in the fix for this exact root cause.</div>
      </div>
    </div>
  )
}

function TestCodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1C2222" }}>Targeted Regression Test Generated</div>
        <button className="btn btn-sm btn-secondary" onClick={handleCopy}>
          {copied ? "✓ Copied to Clipboard" : "📋 Copy Code"}
        </button>
      </div>

      <pre className="code-block" style={{ maxHeight: 360, marginBottom: 24 }}>
        {code}
      </pre>

      <div className="glass-card" style={{ padding: "20px 24px" }}>
        <SectionLabel>How to Integrate This Test</SectionLabel>
        <ol style={{ paddingLeft: 18, fontSize: 13, color: "#636e72", lineHeight: 1.8, display: "flex", flexDirection: "column", gap: 4 }}>
          <li>Save this code to your project&apos;s <code>tests/</code> directory.</li>
          <li>Run the test against your un-fixed codebase to confirm it reproduces the failure.</li>
          <li>Apply the environment or code fix identified in Step 02 (Diagnosis).</li>
          <li>Rerun the test — it should now pass cleanly.</li>
          <li>Commit it to your repository so CI automatically guards against regressions.</li>
        </ol>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9AABAB", marginBottom: 10, fontFamily: "var(--font-mono)" }}>
      {children}
    </div>
  )
}

function MetaCell({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ padding: "12px 14px", background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 6, textAlign: "center" }}>
      <div style={{ fontSize: 11, color: "#718484", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent ?? "#1C2222", fontFamily: "var(--font-mono)" }}>{value}</div>
    </div>
  )
}

function FieldRow({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: "#1C2222" }}>{label}</label>
        <span style={{ fontSize: 12, color: "#718484" }}>{hint}</span>
      </div>
      {children}
    </div>
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

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", fontSize: 13,
  border: "1px solid #c4c9cf", borderRadius: 6,
  background: "#fff", color: "#1C2222",
  boxSizing: "border-box", outline: "none",
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RegressionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const sess          = useSession(sessionId)
  const diagnosisId   = sess.mode === "live" ? sess.diagnosis?.id : undefined

  return (
    <main className="animate-float-in">

      {/* Header */}
      <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#34C1C1", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 6 }}>
          05 / Automated Fix Guarding
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1C2222", letterSpacing: "-0.5px" }}>
            Generate Targeted Regression Test
          </h1>
          <ModeBadge mode={sess.mode} />
        </div>
      </div>

      {/* Non-Technical Info Banner */}
      <div className="info-callout" style={{ marginBottom: 28 }}>
        <div className="info-callout-icon">i</div>
        <div>
          <strong>What is Regression Guard?</strong> Once a root cause is diagnosed, Step 05 auto-generates a targeted unit test designed specifically to reproduce that exact failure condition so it never happens again.
        </div>
      </div>

      {sess.mode === "demo" ? (
        <DemoView scenario={sess.scenario!} />
      ) : (
        <LiveForm
          sessionId={sessionId}
          diagnosisId={diagnosisId}
          loading={sess.loadingRegression}
          result={sess.regression}
          error={sess.error}
          onSubmit={(req) => sess.fetchRegression(req)}
        />
      )}

    </main>
  )
}
