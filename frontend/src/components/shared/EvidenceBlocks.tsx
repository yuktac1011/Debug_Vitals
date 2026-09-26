"use client";

export interface Evidence {
  id: string; index: number; source: string;
  timestamp: string; value: string; note: string;
  timelineEventId?: string;
}

export function EvidenceBlocks({ items, onTrace }: { items: Evidence[]; onTrace?: (id: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((ev) => (
        <div key={ev.id} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          {/* Index */}
          <span style={{ fontFamily: "var(--font-jb-mono), monospace", fontSize: 10, color: "#9AABAB", width: 20, flexShrink: 0, paddingTop: 4, textAlign: "right" }}>
            {String(ev.index).padStart(2, "0")}
          </span>

          {/* Card */}
          <div style={{
            flex: 1, minWidth: 0, background: "#FFFFFF", border: "1px solid #D8E4E4",
            borderRadius: 8, overflow: "hidden",
            boxShadow: "2px 2px 6px rgba(166,190,190,0.2), -1px -1px 3px rgba(255,255,255,0.8)",
          }}>
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12,
              padding: "8px 14px 7px",
              background: "linear-gradient(to right, rgba(52,193,193,0.05), rgba(75,133,190,0.04))",
              borderBottom: "1px solid #E8F0F0",
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1C2222" }}>{ev.source}</span>
              <span style={{ fontFamily: "var(--font-jb-mono), monospace", fontSize: 10, color: "#9AABAB", flexShrink: 0 }}>{ev.timestamp}</span>
            </div>

            {/* Value */}
            <div style={{ padding: "10px 14px 0" }}>
              <code style={{
                display: "block", fontFamily: "var(--font-jb-mono), monospace",
                fontSize: 12, lineHeight: 1.65, color: "#34C1C1",
                background: "#F2F6F6", border: "1px solid #D8E4E4", borderRadius: 5,
                padding: "7px 12px",
                boxShadow: "inset 1px 1px 3px rgba(166,190,190,0.25), inset -1px -1px 2px rgba(255,255,255,0.8)",
              }}>{ev.value}</code>
            </div>

            {/* Note */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px 10px" }}>
              <span style={{ fontSize: 12, color: "#718484" }}>{ev.note}</span>
              {ev.timelineEventId && onTrace && (
                <button onClick={() => onTrace(ev.timelineEventId!)} style={{
                  fontFamily: "var(--font-jb-mono), monospace", fontSize: 10, color: "#34C1C1",
                  background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2, padding: 0,
                }}>
                  view in timeline →
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
