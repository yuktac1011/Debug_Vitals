"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface SidebarProps {
  sessionId?: string;
  wsState?: "connected" | "reconnecting" | "disconnected";
  backendOk?: boolean;
}

const NAV_ITEMS = [
  { key: "overview",     label: "Overview",     icon: "⊡" },
  { key: "diagnosis",    label: "Diagnosis",    icon: "◈" },
  { key: "timeline",     label: "Timeline",     icon: "◫" },
  { key: "environment",  label: "Environment",  icon: "◎" },
];

function navHref(key: string, id: string) {
  return key === "overview" ? `/session/${id}` : `/session/${id}/${key}`;
}

export function Sidebar({ sessionId, wsState = "disconnected", backendOk = false }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{
        padding: "20px 20px 16px",
        borderBottom: "1px solid #E8F0F0",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8,
          background: "linear-gradient(135deg, #34C1C1 0%, #4B85BE 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, color: "#fff", fontWeight: 700, flexShrink: 0,
          boxShadow: "2px 2px 6px rgba(52,193,193,0.35), -1px -1px 3px rgba(255,255,255,0.8)",
        }}>⊕</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1C2222", letterSpacing: "-0.01em" }}>
          AgentDoctor
        </span>
      </div>

      {/* Nav */}
      <div style={{ padding: "16px 12px 0", flex: 1 }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9AABAB", paddingLeft: 8, marginBottom: 8 }}>
          Project
        </p>
        <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {NAV_ITEMS.map((item) => {
            const href = sessionId ? navHref(item.key, sessionId) : "#";
            const active = pathname === href;
            return (
              <Link
                key={item.key}
                href={href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  padding: "7px 10px",
                  borderRadius: 8,
                  color: active ? "#34C1C1" : "#718484",
                  background: active ? "rgba(52,193,193,0.08)" : "transparent",
                  textDecoration: "none",
                  transition: "all 0.12s",
                  boxShadow: active ? "inset 1px 1px 3px rgba(52,193,193,0.15), inset -1px -1px 2px rgba(255,255,255,0.8)" : "none",
                  border: active ? "1px solid rgba(52,193,193,0.2)" : "1px solid transparent",
                }}
              >
                <span style={{ fontSize: 11, opacity: 0.6 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Session badge */}
      {sessionId && (
        <div style={{ padding: "16px 20px 0" }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9AABAB", marginBottom: 8 }}>
            Session
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8,
            background: "#F9FBFB", borderRadius: 8, padding: "6px 10px",
            border: "1px solid #E8F0F0",
            boxShadow: "inset 1px 1px 3px rgba(166,190,190,0.25), inset -1px -1px 2px rgba(255,255,255,0.9)",
          }}>
            <span style={{ fontFamily: "var(--font-jb-mono), monospace", fontSize: 11, color: "#4B85BE", fontWeight: 600 }}>
              #{sessionId.slice(0, 4).toUpperCase()}
            </span>
            {wsState === "connected" && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: "auto" }}>
                <span className="live-dot" />
                <span style={{ fontFamily: "var(--font-jb-mono), monospace", fontSize: 10, color: "#2BAB60" }}>Live</span>
              </span>
            )}
            {wsState === "reconnecting" && (
              <span style={{ fontFamily: "var(--font-jb-mono), monospace", fontSize: 10, color: "#EC9C13", marginLeft: "auto" }}>
                sync…
              </span>
            )}
          </div>
        </div>
      )}

      {/* Status footer */}
      <div style={{
        marginTop: "auto", padding: "14px 20px",
        borderTop: "1px solid #E8F0F0",
        display: "flex", flexDirection: "column", gap: 7,
      }}>
        <SidebarStatus label="Backend"   ok={backendOk} />
        <SidebarStatus label="WebSocket" ok={wsState === "connected"} warn={wsState === "reconnecting"} />
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hide-mobile" style={{
        width: 210, minWidth: 210, background: "#FFFFFF",
        borderRight: "1px solid #D8E4E4",
        boxShadow: "var(--neo-sidebar)",
        display: "flex", flexDirection: "column", height: "100%",
      }}>
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div style={{
        display: "none",
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "#FFFFFF", borderBottom: "1px solid #D8E4E4",
        boxShadow: "0 2px 8px rgba(166,190,190,0.25)",
        padding: "0 16px", height: 52,
        alignItems: "center", justifyContent: "space-between",
      }} className="mobile-topbar">
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1C2222" }}>⊕ AgentDoctor</span>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#718484" }}
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{
          position: "fixed", top: 52, left: 0, right: 0, bottom: 0, zIndex: 40,
          background: "#FFFFFF", display: "flex", flexDirection: "column",
          borderRight: "1px solid #D8E4E4",
        }}>
          {sidebarContent}
        </div>
      )}
    </>
  );
}

function SidebarStatus({ label, ok, warn }: { label: string; ok: boolean; warn?: boolean }) {
  const dot = ok ? "#2BAB60" : warn ? "#EC9C13" : "#9AABAB";
  const text = ok ? "#2BAB60" : warn ? "#EC9C13" : "#9AABAB";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0,
        boxShadow: ok ? `0 0 0 2px rgba(43,171,96,0.18)` : "none" }} />
      <span style={{ fontFamily: "var(--font-jb-mono), monospace", fontSize: 10, color: text }}>{label}</span>
    </div>
  );
}
