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
      <div style={{ padding: "24px", border: "1px solid var(--skeuo-border)", boxShadow: "9px 9px 16px var(--skeuo-shadow-dark), -9px -9px 16px var(--skeuo-shadow-light-strong)", borderRadius: 6, color: "var(--skeuo-text-inset-color)", fontSize: 13 }}>
        Regression Guard is available after the diagnosis is verified. Complete step 04 first.
      </div>
    )
  }

  return (
    <>
      {/* Confirmed banner */}
      <ConfirmedBanner />

      {/* Root cause reminder */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Root cause</SectionLabel>
        <div style={{ padding: "14px 18px", background: "var(--skeuo-bg)", border: "1px solid var(--skeuo-border)", boxShadow: "9px 9px 16px var(--skeuo-shadow-dark), -9px -9px 16px var(--skeuo-shadow-light-strong)", borderRadius: 6, fontSize: 13, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)", lineHeight: 1.55 }} className="skeuo-panel">
          {scenario.rootCause}
        </div>
      </div>

      {/* Generate button / code */}
      {!generated ? (
        <button className="btn btn-primary" onClick={() => setGenerated(true)}>
          Generate regression test
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
        <div style={{ padding: "12px 16px", background: "rgba(236,156,19,0.06)", border: "1px solid rgba(236,156,19,0.2)", borderRadius: 4, color: "#b87100", fontSize: 12, marginBottom: 20 }}>
          Run <strong>Diagnosis</strong> (step 02) first to get a Diagnosis ID, or enter one manually below.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>

          <FieldRow label="Diagnosis ID" hint="Required — from step 02">
            <input
              value={diagId}
              onChange={(e) => setDiagId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              required
              style={inputStyle}
            />
          </FieldRow>

          <FieldRow label="Top N causes" hint="How many root causes to cover with tests">
            <input
              type="number"
              min={1} max={10}
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              style={{ ...inputStyle, width: 80 }}
            />
          </FieldRow>

          <FieldRow label="Language" hint="Test framework language">
            <select value={language} onChange={(e) => setLanguage(e.target.value)} style={inputStyle}>
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </FieldRow>

          <FieldRow label="Docker image" hint="Container for test execution (if run immediately)">
            <select value={image} onChange={(e) => setImage(e.target.value)} style={inputStyle}>
              {DOCKER_IMAGES.map((img) => <option key={img} value={img}>{img}</option>)}
            </select>
          </FieldRow>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={runNow}
              onChange={(e) => setRunNow(e.target.checked)}
              style={{ width: 14, height: 14 }}
            />
            <span style={{ fontSize: 12, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)" }}>Run tests immediately after generation</span>
          </label>

        </div>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(219,36,36,0.06)", border: "1px solid rgba(219,36,36,0.2)", borderRadius: 4, color: "#DB2424", fontSize: 12, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading || !diagId.trim()} style={{ opacity: (loading || !diagId.trim()) ? 0.6 : 1 }}>
          {loading ? "Generating…" : "Generate regression tests"}
        </button>
      </form>

      {result && <RegressionResult result={result} />}

      {/* Method note */}
      <div style={{ borderTop: "1px solid var(--skeuo-border)", paddingTop: 20, marginTop: 32 }}>
        <SectionLabel>Method</SectionLabel>
        <p style={{ fontSize: 12, color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", lineHeight: 1.65 }}>
          The backend generates targeted test code from your top root causes.
          With <em>run immediately</em>, tests execute in the specified container and results are recorded.
          Add the generated tests to your CI pipeline to prevent regression.
        </p>
      </div>
    </div>
  )
}

function RegressionResult({ result }: { result: RegressionGuardResponse }) {
  return (
    <div style={{ marginTop: 28 }}>
      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginBottom: 24 }}>
        <MetaCell label="Generated" value={String(result.tests_generated)} />
        <MetaCell label="Run"       value={String(result.tests_run)} />
        <MetaCell label="Passed"    value={String(result.tests_passed)} accent="#2BAB60" />
        <MetaCell label="Failed"    value={String(result.tests_failed)} accent={result.tests_failed > 0 ? "#DB2424" : undefined} />
      </div>

      {/* Individual tests */}
      {result.tests.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {result.tests.map((t) => (
            <TestCard key={t.id} test={t} />
          ))}
        </div>
      )}
    </div>
  )
}

function TestCard({ test }: { test: RegressionTestItem }) {
  const [open, setOpen] = useState(false)
  const statusColor = test.run_status === "passed" ? "#2BAB60"
    : test.run_status === "failed" ? "#DB2424"
    : test.generation_status === "completed" ? "#4B85BE"
    : "#9AABAB"

  return (
    <div style={{ padding: "16px 18px", background: "var(--skeuo-bg)", border: "1px solid var(--skeuo-border)", boxShadow: "9px 9px 16px var(--skeuo-shadow-dark), -9px -9px 16px var(--skeuo-shadow-light-strong)", borderRadius: 6 }} className="skeuo-panel">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: test.test_code ? 8 : 0 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, display: "inline-block", flexShrink: 0 }} />
        <span style={{ fontFamily: "var(--font-mono-jb), monospace", fontSize: 12, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)", flex: 1, wordBreak: "break-all" }}>
          {test.target_file_path ?? `test-${test.id.slice(0, 8)}`}
        </span>
        <span style={{ fontSize: 10, fontFamily: "var(--font-mono-jb), monospace", color: statusColor }}>{test.run_status ?? test.generation_status}</span>
        {test.test_code && (
          <button
            onClick={() => setOpen(!open)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", padding: 0 }}
          >
            {open ? "hide" : "show"}
          </button>
        )}
      </div>
      {open && test.test_code && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
            <button
              onClick={() => navigator.clipboard.writeText(test.test_code!)}
              className="btn btn-sm"
              style={{ fontSize: 10, padding: "2px 8px" }}
            >Copy</button>
          </div>
          <pre style={{ fontFamily: "var(--font-mono-jb), monospace", fontSize: 11, lineHeight: 1.75, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)", background: "var(--skeuo-bg)", boxShadow: "inset 6px 6px 10px 0 var(--skeuo-shadow-dark-strong), inset -6px -6px 10px 0 var(--skeuo-shadow-light)", border: "1px solid var(--skeuo-border)", boxShadow: "9px 9px 16px var(--skeuo-shadow-dark), -9px -9px 16px var(--skeuo-shadow-light-strong)", borderRadius: 4, padding: "12px 14px", overflow: "auto", whiteSpace: "pre", maxHeight: 320 }}>
            {test.test_code}
          </pre>
        </div>
      )}
      {test.run_output && (
        <pre style={{ marginTop: 8, fontFamily: "var(--font-mono-jb), monospace", fontSize: 10, lineHeight: 1.6, color: "var(--skeuo-text-inset-color)", background: "var(--skeuo-bg)", border: "1px solid #EBF2F2", borderRadius: 4, padding: "8px 10px", overflow: "auto", whiteSpace: "pre-wrap", maxHeight: 120 }}>
          {test.run_output}
        </pre>
      )}
    </div>
  )
}

// ── Shared ────────────────────────────────────────────────────────────────────

function ConfirmedBanner() {
  return (
    <div style={{ padding: "14px 20px", background: "rgba(43,171,96,0.05)", border: "1px solid rgba(43,171,96,0.2)", borderRadius: 6, marginBottom: 32, display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2BAB60", flexShrink: 0, display: "inline-block" }} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#2BAB60", marginBottom: 1 }}>Diagnosis confirmed</div>
        <div style={{ fontSize: 12, color: "var(--skeuo-text-inset-color)" }}>Hypothesis verified in step 04. Regression test will cover the confirmed root cause.</div>
      </div>
    </div>
  )
}

function TestCodeBlock({ code }: { code: string }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)" }}>Regression test generated</div>
        <button className="btn btn-sm btn-secondary" onClick={() => navigator.clipboard.writeText(code)}>Copy</button>
      </div>
      <pre style={{ fontFamily: "var(--font-mono-jb), monospace", fontSize: 12, lineHeight: 1.75, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)", background: "var(--skeuo-bg)", boxShadow: "inset 6px 6px 10px 0 var(--skeuo-shadow-dark-strong), inset -6px -6px 10px 0 var(--skeuo-shadow-light)", border: "1px solid var(--skeuo-border)", boxShadow: "9px 9px 16px var(--skeuo-shadow-dark), -9px -9px 16px var(--skeuo-shadow-light-strong)", borderRadius: 6, padding: "18px 20px", overflow: "auto", whiteSpace: "pre" }}>
        {code}
      </pre>
      <div style={{ marginTop: 20, padding: "14px 18px", background: "var(--skeuo-bg)", border: "1px solid var(--skeuo-border)", boxShadow: "9px 9px 16px var(--skeuo-shadow-dark), -9px -9px 16px var(--skeuo-shadow-light-strong)", borderRadius: 6 }} className="skeuo-panel">
        <SectionLabel>Instructions</SectionLabel>
        <ol style={{ paddingLeft: 16, fontSize: 12, color: "var(--skeuo-text-inset-color)", lineHeight: 1.75, display: "flex", flexDirection: "column", gap: 4 }}>
          <li>Add this test to your project&apos;s test suite.</li>
          <li>Run it against the current codebase to confirm it fails.</li>
          <li>Apply the fix identified in the root cause analysis.</li>
          <li>Run the test again — it should now pass.</li>
          <li>Keep it in CI to prevent regression.</li>
        </ol>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", marginBottom: 10, fontFamily: "var(--font-mono-jb), monospace" }}>
      {children}
    </div>
  )
}

function MetaCell({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ padding: "10px 12px", background: "var(--skeuo-bg)", border: "1px solid #EBF2F2", borderRadius: 4, textAlign: "center" }}>
      <div style={{ fontSize: 10, color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent ?? "#1C2222", fontFamily: "var(--font-mono-jb), monospace" }}>{value}</div>
    </div>
  )
}

function FieldRow({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)" }}>{label}</label>
        <span style={{ fontSize: 11, color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)" }}>{hint}</span>
      </div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", fontSize: 13,
  border: "1px solid var(--skeuo-border)", boxShadow: "9px 9px 16px var(--skeuo-shadow-dark), -9px -9px 16px var(--skeuo-shadow-light-strong)", borderRadius: 4,
  background: "var(--skeuo-bg)", color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)",
  boxSizing: "border-box",
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RegressionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const sess          = useSession(sessionId)

  // Pull the diagnosis ID from the live session state (populated after step 02)
  const diagnosisId = sess.mode === "live" ? sess.diagnosis?.id : undefined

  return (
    <main style={{ padding: "clamp(20px,4vw,40px) clamp(20px,4vw,48px)", maxWidth: 820 }} className="skeuo-panel">

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", marginBottom: 8, fontFamily: "var(--font-mono-jb), monospace" }}>
          05 / Regression Guard
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)", letterSpacing: "-0.3px", marginBottom: 6 }}>
          Generate regression test
        </h1>
        <p style={{ fontSize: 13, color: "var(--skeuo-text-inset-color)" }}>
          {sess.mode === "demo"
            ? "One targeted test for this exact failure — prevents recurrence."
            : "Generate targeted tests from your root cause analysis to prevent regression."}
        </p>
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
