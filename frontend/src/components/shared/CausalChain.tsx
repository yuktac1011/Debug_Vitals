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
  agent: "Agent Action",
  env:   "Environment",
  test:  "Test Result",
  ci:    "CI Pipeline",
  dep:   "Dependency",
  git:   "Code Change",
}

export default function CausalChain({ steps }: { steps: CausalStep[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }} className="glass-card-container">
      {steps.map((step, i) => (
        <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Step card */}
          <div className="glass-card" style={{
            width: 175,
            minHeight: 130,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "#fff",
            border: `1px solid ${step.status === "fail" ? "rgba(219,36,36,0.3)" : "rgba(0,0,0,0.08)"}`,
            borderTop: `4px solid ${KIND_COLOR[step.kind]}`,
            borderRadius: 8,
            padding: "12px 14px",
            boxShadow: "var(--shadow-neo-sm)",
          }}>
            <div>
              <div style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: KIND_COLOR[step.kind],
                marginBottom: 6,
                fontFamily: "var(--font-mono)",
              }}>
                {KIND_LABEL[step.kind]}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1C2222", lineHeight: 1.35, marginBottom: 4 }}>
                {step.label}
              </div>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#718484",
                lineHeight: 1.4,
              }}>
                {step.sublabel}
              </div>
            </div>

            {step.status === "fail" && (
              <div style={{
                marginTop: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 10,
                fontWeight: 700,
                color: "#DB2424",
                background: "rgba(219,36,36,0.08)",
                padding: "2px 8px",
                borderRadius: 4,
                width: "fit-content",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#DB2424", display: "inline-block" }} className="pulse-dot" />
                Failure
              </div>
            )}
          </div>

          {/* Arrow connector */}
          {i < steps.length - 1 && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#34C1C1",
              fontSize: 20,
              fontWeight: 800,
              padding: "0 2px",
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
