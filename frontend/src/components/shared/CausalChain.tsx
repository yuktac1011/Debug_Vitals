"use client";

export type CausalStep = {
  id: string;
  marker: string;
  kind: string;
  label: string;
  detail?: string;
  state?: "failure" | "warning" | "success" | "normal";
};

const STATE: Record<string, { color: string; bg: string; border: string; labelColor: string }> = {
  failure: { color: "#DB2424", bg: "rgba(219,36,36,0.07)",   border: "rgba(219,36,36,0.2)",  labelColor: "#DB2424" },
  warning: { color: "#EC9C13", bg: "rgba(236,156,19,0.07)",  border: "rgba(236,156,19,0.2)", labelColor: "#EC9C13" },
  success: { color: "#2BAB60", bg: "rgba(43,171,96,0.07)",   border: "rgba(43,171,96,0.2)",  labelColor: "#2BAB60" },
  normal:  { color: "#4B85BE", bg: "rgba(75,133,190,0.06)",  border: "rgba(75,133,190,0.18)", labelColor: "#718484" },
};

export function CausalChain({ steps }: { steps: CausalStep[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", paddingLeft: 4 }}>
      {steps.map((step, i) => {
        const s = STATE[step.state ?? "normal"];
        return (
          <div key={step.id} style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              {/* Track */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 30, flexShrink: 0, paddingTop: 12 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: s.bg,
                  border: `1.5px solid ${s.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  boxShadow: `1px 1px 4px ${s.border}, -1px -1px 3px rgba(255,255,255,0.8)`,
                }}>
                  <span style={{ fontFamily: "var(--font-jb-mono), monospace", fontSize: 10, color: s.color, lineHeight: 1 }}>{step.marker}</span>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ width: 1, flex: 1, minHeight: 20, background: `linear-gradient(to bottom, ${s.border}, #E8F0F0)`, marginTop: 4, marginBottom: -4 }} />
                )}
              </div>

              {/* Card */}
              <div style={{
                flex: 1, minWidth: 0,
                background: s.bg,
                border: `1px solid ${s.border}`,
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: i < steps.length - 1 ? 6 : 0,
                boxShadow: `1px 1px 4px rgba(166,190,190,0.2), -1px -1px 3px rgba(255,255,255,0.7)`,
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: s.color, marginBottom: 4, opacity: 0.9 }}>
                  {step.kind}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: s.labelColor, lineHeight: 1.35, marginBottom: step.detail ? 4 : 0 }}>
                  {step.label}
                </div>
                {step.detail && (
                  <div style={{ fontFamily: "var(--font-jb-mono), monospace", fontSize: 11, color: "#718484", marginTop: 2 }}>
                    {step.detail}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
