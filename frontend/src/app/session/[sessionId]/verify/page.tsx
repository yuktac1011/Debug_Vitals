"use client"

import { use, useState } from "react"
import { useSession } from "@/lib/useSession"
import type { VerifyRequest, VerificationResponse } from "@/lib/api"

// Docker images that match the backend allowlist
const DOCKER_IMAGES = [
  "python:3.11-slim",
  "python:3.10-slim",
  "python:3.9-slim",
  "node:18-alpine",
  "node:20-alpine",
  "ubuntu:22.04",
]

// ── Demo view ─────────────────────────────────────────────────────────────────

function DemoView({ scenario }: { scenario: ReturnType<typeof import("@/lib/useSession").useSession>["scenario"] & object }) {
  return (
    <>
      {/* Hypothesis */}
      <div style={{ padding: "18px 22px", background: "var(--skeuo-bg)", border: "1px solid var(--skeuo-border)", boxShadow: "9px 9px 16px var(--skeuo-shadow-dark), -9px -9px 16px var(--skeuo-shadow-light-strong)", borderRadius: 6, marginBottom: 32 }} className="skeuo-panel">
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4B85BE", marginBottom: 8, fontFamily: "var(--font-mono-jb), monospace" }}>
          Hypothesis
        </div>
        <p style={{ fontSize: 14, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)", fontStyle: "italic", lineHeight: 1.6 }}>
          &ldquo;{scenario.hypothesis}&rdquo;
        </p>
      </div>

      {/* Control vs Experiment */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
        <CompactCard color="#DB2424" label="Control" title={scenario.control.label} result={scenario.control.result} status="fail" />
        <CompactCard
          color={scenario.experiment.status === "ok" ? "#2BAB60" : "#EC9C13"}
          label="Experiment"
          title={scenario.experiment.label}
          result={scenario.experiment.result}
          status={scenario.experiment.status as "ok" | "fail" | "running"}
        />
      </div>

      {/* Result */}
      {scenario.verified && (
        <div style={{ padding: "20px 24px", background: "rgba(43,171,96,0.05)", border: "1px solid rgba(43,171,96,0.2)", borderRadius: 6, marginBottom: 32 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#2BAB60", marginBottom: 10, fontFamily: "var(--font-mono-jb), monospace" }}>
            Result
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)", marginBottom: 4 }}>Hypothesis confirmed.</div>
          <div style={{ fontSize: 12, color: "var(--skeuo-text-inset-color)" }}>Experiment passed with 0 failures. Root cause is verified.</div>
        </div>
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
  sessionId: string
  diagnosisId?: string
  loading: boolean
  result?: VerificationResponse
  error?: string
  onSubmit: (req: VerifyRequest) => void
}) {
  const [image,   setImage]   = useState(DOCKER_IMAGES[0])
  const [command, setCommand] = useState("pytest -x")
  const [diagId,  setDiagId]  = useState(diagnosisId ?? "")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const req: VerifyRequest = {
      docker_image:  image,
      command,
      ...(diagId ? { diagnosis_id: diagId } : {}),
    }
    onSubmit(req)
  }

  return (
    <div>
      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>

          {/* Diagnosis ID (optional, auto-filled if available) */}
          <FieldRow label="Diagnosis ID" hint="Optional — links this run to a diagnosis">
            <input
              value={diagId}
              onChange={(e) => setDiagId(e.target.value)}
              placeholder="Leave blank to run without a linked diagnosis"
              style={inputStyle}
            />
          </FieldRow>

          {/* Docker image */}
          <FieldRow label="Docker image" hint="Container to run the test in">
            <select value={image} onChange={(e) => setImage(e.target.value)} style={inputStyle}>
              {DOCKER_IMAGES.map((img) => <option key={img} value={img}>{img}</option>)}
            </select>
          </FieldRow>

          {/* Command */}
          <FieldRow label="Command" hint="Test command to run inside the container">
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="pytest -x"
              required
              style={{ ...inputStyle, fontFamily: "var(--font-mono-jb), monospace" }}
            />
          </FieldRow>

        </div>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(219,36,36,0.06)", border: "1px solid rgba(219,36,36,0.2)", borderRadius: 4, color: "#DB2424", fontSize: 12, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
          {loading ? "Running…" : "Run verification"}
        </button>
      </form>

      {/* Result */}
      {result && <VerifyResult result={result} />}

      {/* Method note */}
      <div style={{ borderTop: "1px solid var(--skeuo-border)", paddingTop: 20, marginTop: 32 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", marginBottom: 10, fontFamily: "var(--font-mono-jb), monospace" }}>
          Method
        </div>
        <p style={{ fontSize: 12, color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", lineHeight: 1.65 }}>
          The backend runs your command inside the specified Docker container. A zero exit code confirms the environment is healthy.
          Link a diagnosis ID to have the confidence score updated automatically.
        </p>
      </div>
    </div>
  )
}

function VerifyResult({ result }: { result: VerificationResponse }) {
  const ok = result.exit_code === 0
  const statusColor = ok ? "#2BAB60" : result.status === "pending" ? "#EC9C13" : "#DB2424"

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: statusColor, fontFamily: "var(--font-mono-jb), monospace" }}>
          Result
        </span>
        <StatusBadge status={result.status} exitCode={result.exit_code} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
        <MetaCell label="Status"     value={result.status} />
        <MetaCell label="Exit code"  value={result.exit_code !== undefined ? String(result.exit_code) : "—"} />
        <MetaCell label="Image"      value={result.docker_image ?? "—"} />
        <MetaCell label="Command"    value={result.command ?? "—"} mono />
      </div>

      {result.stdout && (
        <OutputBlock label="stdout" content={result.stdout} />
      )}
      {result.stderr && (
        <OutputBlock label="stderr" content={result.stderr} color="#DB2424" />
      )}
    </div>
  )
}

// ── Small shared pieces ───────────────────────────────────────────────────────

function CompactCard({ color, label, title, result, status }: {
  color: string; label: string; title: string; result: string; status: "ok" | "fail" | "running"
}) {
  const cfg = {
    ok:      { bg: "rgba(43,171,96,0.07)",  border: "rgba(43,171,96,0.2)",  color: "#2BAB60", text: "Passed" },
    fail:    { bg: "rgba(219,36,36,0.07)",  border: "rgba(219,36,36,0.2)",  color: "#DB2424", text: "Failed" },
    running: { bg: "rgba(236,156,19,0.07)", border: "rgba(236,156,19,0.22)", color: "#b87100", text: "Running" },
  }[status]
  return (
    <div style={{ padding: "20px 22px", background: "var(--skeuo-bg)", border: `1px solid rgba(0,0,0,0.08)`, borderTop: `3px solid ${color}`, borderRadius: 6 }} className="skeuo-panel">
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color, marginBottom: 12, fontFamily: "var(--font-mono-jb), monospace" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono-jb), monospace", fontSize: 13, fontWeight: 600, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)", marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--skeuo-text-inset-color)", marginBottom: 12, lineHeight: 1.5 }}>{result}</div>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color, display: "inline-block" }} />
        {cfg.text}
      </span>
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

function StatusBadge({ status, exitCode }: { status: string; exitCode?: number }) {
  const ok    = exitCode === 0
  const color = ok ? "#2BAB60" : status === "pending" ? "#b87100" : "#DB2424"
  const bg    = ok ? "rgba(43,171,96,0.07)" : status === "pending" ? "rgba(236,156,19,0.07)" : "rgba(219,36,36,0.07)"
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: bg, color, border: `1px solid ${color}22` }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block" }} />
      {status}
    </span>
  )
}

function MetaCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ padding: "10px 12px", background: "var(--skeuo-bg)", border: "1px solid #EBF2F2", borderRadius: 4 }}>
      <div style={{ fontSize: 10, color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)", fontFamily: mono ? "var(--font-mono-jb), monospace" : undefined, wordBreak: "break-all" }}>{value}</div>
    </div>
  )
}

function OutputBlock({ label, content, color = "#1C2222" }: { label: string; content: string; color?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", marginBottom: 6, fontFamily: "var(--font-mono-jb), monospace" }}>{label}</div>
      <pre style={{ fontFamily: "var(--font-mono-jb), monospace", fontSize: 11, lineHeight: 1.7, color, background: "var(--skeuo-bg)", boxShadow: "inset 6px 6px 10px 0 var(--skeuo-shadow-dark-strong), inset -6px -6px 10px 0 var(--skeuo-shadow-light)", border: "1px solid var(--skeuo-border)", boxShadow: "9px 9px 16px var(--skeuo-shadow-dark), -9px -9px 16px var(--skeuo-shadow-light-strong)", borderRadius: 4, padding: "10px 12px", overflow: "auto", whiteSpace: "pre-wrap", maxHeight: 220 }}>
        {content}
      </pre>
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

export default function VerifyPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const sess          = useSession(sessionId)

  // Pull diagnosis ID from live state if available (set after step 02)
  const diagnosisId = sess.mode === "live" ? sess.diagnosis?.id : undefined

  return (
    <main style={{ padding: "clamp(20px,4vw,40px) clamp(20px,4vw,48px)", maxWidth: 820 }} className="skeuo-panel">

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", marginBottom: 8, fontFamily: "var(--font-mono-jb), monospace" }}>
          04 / Verification
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)", letterSpacing: "-0.3px", marginBottom: 6 }}>
          Verify runtime hypothesis
        </h1>
        <p style={{ fontSize: 13, color: "var(--skeuo-text-inset-color)" }}>
          {sess.mode === "demo"
            ? "Run control and experiment to confirm the root cause."
            : "Run a command inside a container to verify your hypothesis."}
        </p>
      </div>

      {sess.mode === "demo" ? (
        <DemoView scenario={sess.scenario!} />
      ) : (
        <LiveForm
          sessionId={sessionId}
          diagnosisId={diagnosisId}
          loading={sess.loadingVerify}
          result={sess.verification}
          error={sess.error}
          onSubmit={(req) => sess.fetchVerify(req)}
        />
      )}

    </main>
  )
}
