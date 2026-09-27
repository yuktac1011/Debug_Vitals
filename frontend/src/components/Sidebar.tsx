"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useWs } from "@/lib/ws"

interface NavItem {
  href: string
  label: string
  step: string
  hint: string
}

interface SidebarProps {
  sessionId: string
}

export default function Sidebar({ sessionId }: SidebarProps) {
  const pathname  = usePathname()
  const { status } = useWs()
  const isDemo    = sessionId.startsWith("demo-")

  const base = `/session/${sessionId}`
  const nav: NavItem[] = [
    { href: `${base}`,            label: "Checkup",          step: "01", hint: "System Health Scan" },
    { href: `${base}/diagnosis`,  label: "Diagnosis",        step: "02", hint: "Root Cause Analysis" },
    { href: `${base}/timeline`,   label: "Timeline",         step: "03", hint: "Full Event History" },
    { href: `${base}/verify`,     label: "Verification",     step: "04", hint: "Sandbox Test Run" },
    { href: `${base}/regression`, label: "Regression Guard", step: "05", hint: "Automated Fix Test" },
  ]

  function isActive(href: string) {
    if (href === base) return pathname === base
    return pathname.startsWith(href)
  }

  return (
    <aside style={{
      width: 240,
      minHeight: "100dvh",
      background: "var(--color-surface)",
      borderRight: "1px solid rgba(0,0,0,0.08)",
      boxShadow: "var(--shadow-neo-sm)",
      display: "flex",
      flexDirection: "column",
      position: "sticky",
      top: 0,
      height: "100dvh",
      overflowY: "auto",
      zIndex: 40,
    }}>
      {/* Brand Header */}
      <div style={{
        padding: "24px 20px 18px",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "linear-gradient(135deg, #34C1C1, #4B85BE)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 800, fontSize: 14,
              boxShadow: "0 2px 8px rgba(52, 193, 193, 0.3)",
            }}>
              +
            </div>
            <div style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#1C2222",
              letterSpacing: "-0.4px",
            }}>
              Agent<span style={{ color: "#34C1C1" }}>Doctor</span>
            </div>
          </div>
        </Link>
        <div style={{
          fontSize: 11,
          color: "#718484",
          marginTop: 6,
          fontFamily: "var(--font-mono)",
        }}>
          Autonomous Diagnostic Layer
        </div>
      </div>

      {/* Session Metadata */}
      <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9AABAB", marginBottom: 6 }}>
          Current Session
        </div>
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 600,
          color: "#1C2222",
          wordBreak: "break-all",
          lineHeight: 1.4,
          background: "rgba(255,255,255,0.6)",
          padding: "4px 8px",
          borderRadius: 4,
          border: "1px solid rgba(0,0,0,0.06)",
        }}>
          {sessionId.replace("demo-", "")}
        </div>

        {/* Live WS Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
          {isDemo ? (
            <span className="badge badge-primary" style={{ fontSize: 10, padding: "2px 8px" }}>
              <span className="dot dot-primary pulse-dot" />
              Demo Mode Active
            </span>
          ) : (
            <span className={`badge ${status === "connected" ? "badge-success" : status === "connecting" ? "badge-warning" : "badge-muted"}`} style={{ fontSize: 10, padding: "2px 8px" }}>
              <span className={`dot ${status === "connected" ? "dot-ok pulse-dot" : "dot-warn"}`} />
              WS: {status}
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "16px 12px" }}>
        <div style={{ padding: "0 10px 10px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9AABAB" }}>
          5-Step Workflow
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {nav.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  textDecoration: "none",
                  color: active ? "#007777" : "#636e72",
                  background: active ? "rgba(52, 193, 193, 0.12)" : "transparent",
                  boxShadow: active ? "inset 2px 2px 5px rgba(0,0,0,0.05), inset -2px -2px 5px rgba(255,255,255,0.8)" : "none",
                  border: active ? "1px solid rgba(52, 193, 193, 0.25)" : "1px solid transparent",
                  transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 800,
                  color: active ? "#34C1C1" : "#9AABAB",
                  background: active ? "rgba(52, 193, 193, 0.15)" : "rgba(0,0,0,0.04)",
                  width: 26, height: 26, borderRadius: 6,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {item.step}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, lineHeight: 1.2 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 10, color: active ? "#007777" : "#9AABAB", marginTop: 2 }}>
                    {item.hint}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer link */}
      <div style={{
        padding: "16px 20px",
        borderTop: "1px solid rgba(0,0,0,0.06)",
      }}>
        <Link href="/" style={{ color: "#718484", textDecoration: "none", fontSize: 12, display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
          &larr; Switch Scenario
        </Link>
      </div>
    </aside>
  )
}
