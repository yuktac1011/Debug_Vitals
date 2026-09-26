import type { Evidence } from "@/lib/demoData"

export default function EvidenceBlocks({ items }: { items: Evidence[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((ev) => (
        <div
          key={ev.id}
          style={{
            background: "#fff",
            border: `1px solid ${ev.status === "fail" ? "rgba(219,36,36,0.2)" : ev.status === "warn" ? "rgba(236,156,19,0.22)" : "#D8E4E4"}`,
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "9px 14px",
            borderBottom: "1px solid #EBF2F2",
            background: "#FAFCFC",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                background: ev.status === "fail" ? "#DB2424" : ev.status === "warn" ? "#EC9C13" : "#2BAB60",
                display: "inline-block",
              }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: "#1C2222" }}>
                {ev.label}
              </span>
            </div>
            {ev.file && (
              <span style={{
                fontFamily: "var(--font-mono-jb), monospace",
                fontSize: 10,
                color: "#718484",
                background: "#EBF2F2",
                border: "1px solid #D8E4E4",
                borderRadius: 3,
                padding: "1px 6px",
              }}>
                {ev.file}
              </span>
            )}
          </div>
          {/* Value */}
          <pre style={{
            fontFamily: "var(--font-mono-jb), monospace",
            fontSize: 12,
            lineHeight: 1.7,
            color: "#1C2222",
            background: "#F9FBFB",
            padding: "10px 14px",
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}>
            {ev.value}
          </pre>
        </div>
      ))}
    </div>
  )
}
