import type { CausalStep } from "@/lib/demoData"

const KIND_COLOR: Record<CausalStep["kind"], string> = {
  agent: "#4B85BE",
  env:   "#EC9C13",
  test:  "#DB2424",
  ci:    "#DB2424",
  dep:   "#EC9C13",
  git:   "#718484",
}

const KIND_LABEL: Record<CausalStep["kind"], string> = {
  agent: "Agent action",
  env:   "Environment",
  test:  "Test result",
  ci:    "CI",
  dep:   "Dependency",
  git:   "Code change",
}

export default function CausalChain({ steps }: { steps: CausalStep[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 0 }}>
      {steps.map((step, i) => (
        <div key={step.id} style={{ display: "flex", alignItems: "flex-start" }}>
          {/* Step card */}
          <div style={{
            width: 156,
            background: "#fff",
            border: `1px solid ${step.status === "fail" ? "rgba(219,36,36,0.2)" : "#D8E4E4"}`,
            borderTop: `3px solid ${KIND_COLOR[step.kind]}`,
            borderRadius: 6,
            padding: "12px 14px",
          }}>
            <div style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: KIND_COLOR[step.kind],
              marginBottom: 5,
            }}>
              {KIND_LABEL[step.kind]}
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#1C2222", lineHeight: 1.35, marginBottom: 4 }}>
              {step.label}
            </div>
            <div style={{
              fontFamily: "var(--font-mono-jb), monospace",
              fontSize: 10,
              color: "#718484",
              lineHeight: 1.4,
            }}>
              {step.sublabel}
            </div>
            {step.status === "fail" && (
              <div style={{
                marginTop: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10,
                fontWeight: 600,
                color: "#DB2424",
              }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#DB2424", display: "inline-block" }} />
                failure
              </div>
            )}
          </div>

          {/* Arrow connector */}
          {i < steps.length - 1 && (
            <div style={{
              display: "flex",
              alignItems: "center",
              padding: "0 6px",
              marginTop: 24,
              color: "#9AABAB",
              fontSize: 16,
              lineHeight: 1,
              flexShrink: 0,
            }}>
              &rarr;
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
