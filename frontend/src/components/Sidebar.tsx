"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useWs } from "@/lib/ws"

interface NavItem {
  href: string
  label: string
  step: string
}

interface SidebarProps {
  sessionId: string
}

export default function Sidebar({ sessionId }: SidebarProps) {
  const pathname = usePathname()
  const { status } = useWs()

  const base = `/session/${sessionId}`
  const nav: NavItem[] = [
    { href: `${base}`,               label: "Checkup",          step: "01" },
    { href: `${base}/diagnosis`,     label: "Diagnosis",        step: "02" },
    { href: `${base}/timeline`,      label: "Timeline",         step: "03" },
    { href: `${base}/verify`,        label: "Verification",     step: "04" },
    { href: `${base}/regression`,    label: "Regression Guard", step: "05" },
  ]

  function isActive(href: string) {
    if (href === base) return pathname === base
    return pathname.startsWith(href)
  }

  return (
    <aside style={{
      width: 220,
      minHeight: "100dvh",
      background: "#fff",
      borderRight: "1px solid #D8E4E4",
      display: "flex",
      flexDirection: "column",
      position: "sticky",
      top: 0,
      height: "100dvh",
      overflowY: "auto",
    }}>
      {/* Logo */}
      <div style={{
        padding: "24px 20px 20px",
        borderBottom: "1px solid #EBF2F2",
      }}>
        <div style={{
          fontSize: 15,
          fontWeight: 700,
          color: "#1C2222",
          letterSpacing: "-0.3px",
        }}>
          Agent<span style={{ color: "#34C1C1" }}>Doctor</span>
        </div>
        <div style={{
          fontSize: 11,
          color: "#9AABAB",
          marginTop: 3,
          fontFamily: "var(--font-mono-jb), monospace",
        }}>
          Diagnose the cause
        </div>
      </div>

      {/* Session */}
      <div style={{ padding: "14px 20px 10px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9AABAB", marginBottom: 6 }}>
          Session
        </div>
        <div style={{
          fontFamily: "var(--font-mono-jb), monospace",
          fontSize: 11,
          color: "#718484",
          wordBreak: "break-all",
          lineHeight: 1.5,
        }}>
          {sessionId.slice(0, 8)}&hellip;
        </div>
        {/* WS status */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
          <span style={{
            width: 6, height: 6,
            borderRadius: "50%",
            background: status === "connected" ? "#2BAB60" : status === "connecting" ? "#EC9C13" : "#9AABAB",
            display: "inline-block",
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 10, color: "#9AABAB", fontFamily: "var(--font-mono-jb), monospace" }}>
            {status}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "4px 0" }}>
        <div style={{ padding: "4px 20px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9AABAB" }}>
          Investigation
        </div>
        {nav.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 20px",
                textDecoration: "none",
                color: active ? "#1C2222" : "#718484",
                background: active ? "#F2F6F6" : "transparent",
                borderLeft: `2px solid ${active ? "#34C1C1" : "transparent"}`,
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                transition: "color 0.12s, background 0.12s",
              }}
            >
              <span style={{
                fontFamily: "var(--font-mono-jb), monospace",
                fontSize: 10,
                color: active ? "#34C1C1" : "#9AABAB",
                minWidth: 20,
              }}>
                {item.step}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: "16px 20px",
        borderTop: "1px solid #EBF2F2",
        fontSize: 11,
        color: "#9AABAB",
      }}>
        <Link href="/" style={{ color: "#9AABAB", textDecoration: "none", fontSize: 11 }}>
          &larr; All sessions
        </Link>
      </div>
    </aside>
  )
}
