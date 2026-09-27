"use client"

import React from "react"

export default function BackgroundIcons() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* 1. Top Left - Terminal Prompt */}
      <svg
        className="animate-float-slow-1"
        style={{
          position: "absolute",
          top: "6%",
          left: "4%",
          width: 90,
          height: 90,
          color: "#34C1C1",
          opacity: 0.35,
          filter: "drop-shadow(0 4px 12px rgba(52, 193, 193, 0.3))",
        }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>

      {/* 2. Top Right - Code Brackets */}
      <svg
        className="animate-float-slow-2"
        style={{
          position: "absolute",
          top: "10%",
          right: "5%",
          width: 100,
          height: 100,
          color: "#4B85BE",
          opacity: 0.3,
          filter: "drop-shadow(0 4px 12px rgba(75, 133, 190, 0.3))",
        }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>

      {/* 3. Middle Left - Causal Graph / Network Nodes */}
      <svg
        className="animate-float-slow-3"
        style={{
          position: "absolute",
          top: "40%",
          left: "2%",
          width: 110,
          height: 110,
          color: "#34C1C1",
          opacity: 0.28,
          filter: "drop-shadow(0 4px 12px rgba(52, 193, 193, 0.3))",
        }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>

      {/* 4. Middle Right - Diagnostic Shield Plus */}
      <svg
        className="animate-float-slow-1"
        style={{
          position: "absolute",
          top: "45%",
          right: "3%",
          width: 95,
          height: 95,
          color: "#2BAB60",
          opacity: 0.3,
          filter: "drop-shadow(0 4px 12px rgba(43, 171, 96, 0.3))",
        }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <line x1="12" y1="8" x2="12" y2="14" />
        <line x1="9" y1="11" x2="15" y2="11" />
      </svg>

      {/* 5. Bottom Left - Container / Docker Cube */}
      <svg
        className="animate-float-slow-2"
        style={{
          position: "absolute",
          bottom: "8%",
          left: "6%",
          width: 105,
          height: 105,
          color: "#4B85BE",
          opacity: 0.32,
          filter: "drop-shadow(0 4px 12px rgba(75, 133, 190, 0.3))",
        }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>

      {/* 6. Bottom Right - CPU Microchip */}
      <svg
        className="animate-float-slow-3"
        style={{
          position: "absolute",
          bottom: "10%",
          right: "5%",
          width: 95,
          height: 95,
          color: "#EC9C13",
          opacity: 0.3,
          filter: "drop-shadow(0 4px 12px rgba(236, 156, 19, 0.3))",
        }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" />
        <line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" />
        <line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" />
        <line x1="20" y1="15" x2="23" y2="15" />
        <line x1="1" y1="9" x2="4" y2="9" />
        <line x1="1" y1="15" x2="4" y2="15" />
      </svg>

      {/* 7. Center Upper Background - Git Branch */}
      <svg
        className="animate-float-slow-1"
        style={{
          position: "absolute",
          top: "18%",
          left: "52%",
          transform: "translateX(-50%)",
          width: 120,
          height: 120,
          color: "#34C1C1",
          opacity: 0.25,
          filter: "drop-shadow(0 4px 12px rgba(52, 193, 193, 0.25))",
        }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="6" y1="3" x2="6" y2="15" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M18 9a9 9 0 0 1-9 9" />
      </svg>

      {/* 8. Center Lower Background - Database Cylinders */}
      <svg
        className="animate-float-slow-2"
        style={{
          position: "absolute",
          bottom: "25%",
          left: "48%",
          width: 100,
          height: 100,
          color: "#4B85BE",
          opacity: 0.25,
          filter: "drop-shadow(0 4px 12px rgba(75, 133, 190, 0.25))",
        }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    </div>
  )
}
