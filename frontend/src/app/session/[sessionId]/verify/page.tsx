"use client"

import { use, useState } from "react"
import { useSession } from "@/lib/useSession"
import type { VerifyRequest, VerificationResponse } from "@/lib/api"

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
      <div className="glass-card" style={{ padding: "20px 24px", marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#4B85BE", marginBottom: 6, fontFamily: "var(--font-mono)" }}>
          Tested Diagnostic Hypothesis
        </div>
        <p style={{ fontSize: 15, color: "#1C2222", fontStyle: "italic", lineHeight: 1.6, fontWeight: 600 }}>
          &ldquo;{scenario.hypothesis}&rdquo;
        </p>
      </div>

      {/* Control vs Experiment */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 28 }}>
        <CompactCard color="#DB2424" label="Control Run (Default Env)" title={scenario.control.label} result={scenario.control.result} status="fail" />
        <CompactCard
          color={scenario.experiment.status === "ok" ? "#2BAB60" : "#EC9C13"}
          label="Experiment Run (Fixed Env Sandbox)"
          title={scenario.experiment.label}
          result={scenario.experiment.result}
          status={scenario.experiment.status as "ok" | "fail" | "running"}
        />
      </div>

      {/* Result */}
      {scenario.verified && (
        <div style={{ padding: "22px 26px", background: "rgba(43,171,96,0.08)", border: "1px solid rgba(43,171,96,0.3)", borderRadius: "var(--radius-sm)", marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#1e7d44", marginBottom: 6, fontFamily: "var(--font-mono)" }}>
            ✅ Hypothesis Empirically Confirmed
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1C2222", marginBottom: 4 }}>
            Verification Container Passed
          </div>
          <div style={{ fontSize: 13, color: "#636e72" }}>
            Running tests inside the isolated sandbox container returned 0 errors, confirming that the diagnosed environment shift solves the issue.
          </div>
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
      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: "24px 28px", marginBottom: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 24 }}>

          {/* Diagnosis ID */}
          <FieldRow label="Diagnosis Reference ID" hint="Links container rerun to confidence score">
            <input
              value={diagId}
              onChange={(e) => setDiagId(e.target.value)}
              placeholder="Leave blank to run standalone container test"
              style={inputStyle}
            />
          </FieldRow>

          {/* Docker image */}
          <FieldRow label="Sandbox Docker Image" hint="Target environment container">
            <select value={image} onChange={(e) => setImage(e.target.value)} style={inputStyle}>
              {DOCKER_IMAGES.map((img) => <option key={img} value={img}>{img}</option>)}
            </select>
          </FieldRow>

          {/* Command */}
          <FieldRow label="Test Execution Command" hint="Command executed inside container">
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="pytest -x"
              required
              style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
            />
          </FieldRow>

        </div>

        {error && (
          <div style={{ padding: "12px 16px", background: "rgba(219,36,36,0.08)", border: "1px solid rgba(219,36,36,0.3)", borderRadius: 6, color: "#DB2424", fontSize: 13, fontWeight: 600, marginBottom: 18 }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Spawning Sandbox & Executing Rerun…" : "Execute Isolated Sandbox Rerun"}
        </button>
      </form>

      {/* Result */}
      {result && <VerifyResult result={result} />}

      {/* Method note */}
      <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 20, marginTop: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9AABAB", marginBottom: 6, fontFamily: "var(--font-mono)" }}>
          Verification Mechanics
        </div>
        <p style={{ fontSize: 13, color: "#636e72", lineHeight: 1.65 }}>
          The backend spins up an isolated Docker container with zero network access, executes your command, and records stdout/stderr. A exit code of 0 confirms your fix hypothesis.
        </p>
      </div>
    </div>
  )
}

function VerifyResult({ result }: { result: VerificationResponse }) {
  const ok = result.exit_code === 0

  return (
    <div className="glass-card" style={{ padding: "24px 28px", marginTop: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: ok ? "#2BAB60" : "#DB2424", fontFamily: "var(--font-mono)" }}>
          Sandbox Execution Result
        </span>
        <StatusBadge status={result.status} exitCode={result.exit_code} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 20 }}>
        <MetaCell label="Status"     value={result.status} />
        <MetaCell label="Exit Code"  value={result.exit_code !== undefined ? String(result.exit_code) : "—"} />
        <MetaCell label="Docker Image" value={result.docker_image ?? "—"} />
        <MetaCell label="Command"    value={result.command ?? "—"} mono />
      </div>

      {result.stdout && (
        <OutputBlock label="Container stdout Log" content={result.stdout} />
      )}
      {result.stderr && (
        <OutputBlock label="Container stderr Error Log" content={result.stderr} color="#DB2424" />
      )}
    </div>
  )
}

// ── Small shared pieces ───────────────────────────────────────────────────────

function CompactCard({ color, label, title, result, status }: {
  color: string; label: string; title: string; result: string; status: "ok" | "fail" | "running"
}) {
  const cfg = {
    ok:      { badge: "badge-success", dot: "dot-ok", text: "Passed (0 Errors)" },
    fail:    { badge: "badge-error",   dot: "dot-error", text: "Failed (Mismatch)" },
    running: { badge: "badge-warning", dot: "dot-warn", text: "Container Running" },
  }[status]
  return (
    <div className="glass-card" style={{ padding: "22px 24px", borderTop: `4px solid ${color}` }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color, marginBottom: 10, fontFamily: "var(--font-mono)" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "#1C2222", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: "#636e72", marginBottom: 14, lineHeight: 1.5 }}>{result}</div>
      <span className={`badge ${cfg.badge}`}>
        <span className={`dot ${cfg.dot}`} />
        {cfg.text}
      </span>
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

function StatusBadge({ status, exitCode }: { status: string; exitCode?: number }) {
  const ok = exitCode === 0
  return (
    <span className={`badge ${ok ? "badge-success" : "badge-error"}`}>
      <span className={`dot ${ok ? "dot-ok" : "dot-error"}`} />
      {status.toUpperCase()}
    </span>
  )
}

function MetaCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 6 }}>
      <div style={{ fontSize: 10, color: "#718484", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#1C2222", fontWeight: 600, fontFamily: mono ? "var(--font-mono)" : undefined, wordBreak: "break-all" }}>{value}</div>
    </div>
  )
}

function OutputBlock({ label, content, color }: { label: string; content: string; color?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#718484", marginBottom: 6, fontFamily: "var(--font-mono)" }}>{label}</div>
      <pre className="code-block" style={{ color: color ?? "#e2e8f0", maxHeight: 220, margin: 0 }}>
        {content}
      </pre>
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

export default function VerifyPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const sess          = useSession(sessionId)
  const diagnosisId   = sess.mode === "live" ? sess.diagnosis?.id : undefined

  return (
    <main className="animate-float-in">

      {/* Header */}
      <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#34C1C1", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 6 }}>
          04 / Sandbox Hypothesis Testing
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1C2222", letterSpacing: "-0.5px" }}>
            Verify Hypothesis in Isolated Container
          </h1>
          <ModeBadge mode={sess.mode} />
        </div>
      </div>

      {/* Non-Technical Info Banner */}
      <div className="info-callout" style={{ marginBottom: 28 }}>
        <div className="info-callout-icon">i</div>
        <div>
          <strong>What is Verification?</strong> Before committing changes to your repository, Debug Vitals spins up an isolated sandbox container to test your fix hypothesis and prove whether the failure is resolved.
        </div>
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
