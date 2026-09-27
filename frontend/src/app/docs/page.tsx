import React from 'react';
import Link from 'next/link';

export default function DocsPage() {
  return (
    <div style={{ padding: "48px 24px", maxWidth: 800, margin: "0 auto", fontFamily: "var(--font-inter)", color: "#1C2222" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.5px" }}>Debug Vitals <span style={{ color: "#34C1C1" }}>Docs</span></h1>
        <Link href="/dashboard" style={{ color: "#34C1C1", textDecoration: "none", fontWeight: 600 }}>&larr; Back to Dashboard</Link>
      </div>

      <div style={{ background: "var(--color-surface)", padding: 32, borderRadius: 12, boxShadow: "var(--shadow-neo-sm)", border: "1px solid #D8E4E4" }}>
        
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Welcome to Debug Vitals</h2>
        <p style={{ lineHeight: 1.6, color: "#546666", marginBottom: 24 }}>
          This tool is an end-to-end diagnostic and observability system built to monitor, debug, and safely integrate AI coding agents with your local development and CI pipelines.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 16 }}>What It Does</h2>
        <ul style={{ lineHeight: 1.6, color: "#546666", paddingLeft: 20, marginBottom: 24 }}>
          <li><strong>Change Intelligence</strong>: Monitors your file system deterministically to gather a compact context of what changed (without scanning your entire repo).</li>
          <li><strong>Environment & Dependency Snapshots</strong>: Captures your local OS, runtime versions, package managers, and lockfile hashes to detect drift when CI fails.</li>
          <li><strong>Agent Activity Monitor</strong>: Observes agent activities (file writes, commands) and scrubs secrets/passwords before persistence.</li>
          <li><strong>Trust & Permission Engine</strong>: Acts as a rule-based policy engine to intercept and require manual approval for risky agent actions (like destructive commands or modifying `.env`).</li>
          <li><strong>Cross-System Correlation</strong>: Unifies all of the above (agent actions, file changes, dependency state drift, environment mismatches) to confidently explain <em>why</em> a CI build or local run failed.</li>
        </ul>

        <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 16 }}>Important Links</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '12px 16px', background: "#34C1C1", color: "white", textDecoration: "none", borderRadius: 8, fontWeight: 600, width: "fit-content" }}>
            View FastAPI Swagger Docs &rarr;
          </a>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 16 }}>CLI Usage</h2>
        <div style={{ background: "#F4F7F7", padding: 16, borderRadius: 8, fontFamily: "var(--font-mono-jb)", fontSize: 13, color: "#1C2222", marginBottom: 24 }}>
          <div>$ agentdoctor watch</div>
          <div style={{ color: "#718484", marginBottom: 12 }}># Monitors file changes, builds bounded context, and dispatches to AI</div>
          
          <div>$ agentdoctor snapshot</div>
          <div style={{ color: "#718484", marginBottom: 12 }}># Records your current OS, architecture, and runtime versions</div>
          
          <div>$ agentdoctor deps</div>
          <div style={{ color: "#718484" }}># Hashes lockfiles and records resolved dependencies</div>
        </div>

      </div>
    </div>
  );
}
