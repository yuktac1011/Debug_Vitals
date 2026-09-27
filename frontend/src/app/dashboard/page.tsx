"use client"

import { useState, useEffect } from 'react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#DB2424",
  high: "#EC9C13",
  medium: "#F5C344",
  low: "#4B85BE",
  info: "#718484"
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null)
  const [ciRuns, setCiRuns] = useState<any[]>([])
  const [depsHistory, setDepsHistory] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [decisions, setDecisions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filterSeverity, setFilterSeverity] = useState('All')
  const [filterStatus, setFilterStatus] = useState('open')
  
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null)
  const [selectedCiRunId, setSelectedCiRunId] = useState<string | null>(null)
  const [selectedCiRunCorrelation, setSelectedCiRunCorrelation] = useState<any>(null)

  const fetchData = async () => {
    try {
      const [res, ciRes, depsRes, actRes, decRes] = await Promise.all([
        fetch('/api/agentdoctor'),
        fetch('/api/ci'),
        fetch('/api/dependencies'),
        fetch('/api/agent/activity'),
        fetch('/api/agent/decisions')
      ])
      if (!res.ok) throw new Error('Failed to load data')
      const json = await res.json()
      setData(json)
      if (ciRes.ok) setCiRuns(await ciRes.json())
      if (depsRes.ok) setDepsHistory(await depsRes.json())
      if (actRes.ok) setActivity(await actRes.json())
      if (decRes.ok) setDecisions(await decRes.json())
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchCorrelation = async (id: string) => {
    try {
      const res = await fetch(`/api/correlation/${id}`)
      if (res.ok) setSelectedCiRunCorrelation(await res.json())
    } catch (e) {}
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleDecision = async (id: string, action: string) => {
    try {
      await fetch(`/api/agent/decisions/${id}/${action}`, { method: 'POST' })
      fetchData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleAction = async (id: string, action: string) => {
    try {
      await fetch('/api/agentdoctor/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      })
      fetchData()
      if (action !== 'reopen') {
        setSelectedFindingId(null)
      }
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) return <div style={{ padding: 48 }}>Analyzing changes...</div>
  if (error) return (
    <div style={{ padding: 48 }}>
      <p style={{ color: "#DB2424" }}>Unable to load findings.</p>
      <button onClick={fetchData}>Retry</button>
    </div>
  )

  const { environment, riskSummary, findings } = data

  const filteredFindings = findings.filter((f: any) => {
    if (filterStatus !== 'All' && (
      (filterStatus === 'open' && f.status !== 'new' && f.status !== 'open') ||
      (filterStatus !== 'open' && f.status !== filterStatus)
    )) return false
    
    if (filterSeverity !== 'All' && f.severity !== filterSeverity.toLowerCase()) return false
    return true
  })

  const selectedFinding = findings.find((f: any) => f.id === selectedFindingId)
  const selectedCiRun = ciRuns.find((r: any) => r.id === selectedCiRunId)

  return (
    <div style={{ minHeight: "100dvh", background: "var(--color-bg)", fontFamily: "sans-serif" }}>
      {/* Header */}
      <header style={{
        background: "var(--color-surface)",
        padding: "16px 32px",
        borderBottom: "1px solid #D8E4E4",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "#1C2222", margin: 0 }}>
            {environment.os ? "Project Dashboard" : "AgentDoctor"}
          </h1>
          <div style={{ fontSize: 13, color: "#718484", marginTop: 4, display: 'flex', gap: 12 }}>
            {environment.language && <span>Language: {environment.language}</span>}
            {environment.packageManager && <span>Package: {environment.packageManager}</span>}
            {environment.runtime && <span>Runtime: {environment.runtime.type} {environment.runtime.version}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/docs" style={{ color: "#34C1C1", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Docs</a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: "#34C1C1" }}>●</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Watching</span>
          </div>
        </div>
      </header>

      <main style={{ padding: 32, maxWidth: 1400, margin: "0 auto", display: 'flex', gap: 32 }}>
        <div style={{ flex: 1 }}>
          {/* Summary */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
            <div style={{ background: "var(--color-surface)", padding: 24, borderRadius: 8, flex: 1, border: "1px solid #D8E4E4" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#1C2222" }}>{riskSummary.total}</div>
              <div style={{ fontSize: 14, color: "#718484" }}>Total Findings</div>
            </div>
            {['critical', 'high', 'medium', 'low'].map(sev => (
              <div key={sev} style={{ background: "var(--color-surface)", padding: 24, borderRadius: 8, flex: 1, border: `1px solid ${SEVERITY_COLORS[sev]}40`, borderTop: `4px solid ${SEVERITY_COLORS[sev]}` }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#1C2222" }}>{riskSummary[sev] || 0}</div>
                <div style={{ fontSize: 14, color: "#718484", textTransform: 'capitalize' }}>{sev}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: "6px 12px", borderRadius: 4, border: "1px solid #D8E4E4" }}>
              <option value="All">All Statuses</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="ignored">Ignored</option>
            </select>
            <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} style={{ padding: "6px 12px", borderRadius: 4, border: "1px solid #D8E4E4" }}>
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
              <option value="Info">Info</option>
            </select>
          </div>

          {/* List */}
          <div style={{ background: "var(--color-surface)", borderRadius: 8, border: "1px solid #D8E4E4", overflow: 'hidden' }}>
            {filteredFindings.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: "#718484" }}>
                No issues detected. Your latest analysis did not identify any actionable findings.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: "#F5F8F8", borderBottom: "1px solid #D8E4E4", textAlign: 'left' }}>
                    <th style={{ padding: "12px 16px", fontSize: 13, color: "#718484", fontWeight: 500 }}>Severity</th>
                    <th style={{ padding: "12px 16px", fontSize: 13, color: "#718484", fontWeight: 500 }}>Title</th>
                    <th style={{ padding: "12px 16px", fontSize: 13, color: "#718484", fontWeight: 500 }}>File</th>
                    <th style={{ padding: "12px 16px", fontSize: 13, color: "#718484", fontWeight: 500 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFindings.map((f: any) => (
                    <tr 
                      key={f.id} 
                      onClick={() => setSelectedFindingId(f.id)}
                      style={{ 
                        borderBottom: "1px solid #D8E4E4", 
                        cursor: 'pointer',
                        background: selectedFindingId === f.id ? "#F0F5F5" : "transparent"
                      }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ 
                          display: 'inline-block', padding: "2px 8px", borderRadius: 4, 
                          fontSize: 12, fontWeight: 600, 
                          color: SEVERITY_COLORS[f.severity] || "#718484",
                          background: `${SEVERITY_COLORS[f.severity] || "#718484"}15`
                        }}>
                          {f.severity.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 500 }}>{f.title}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#718484", fontFamily: 'monospace' }}>
                        {f.file}{f.line ? `:${f.line}` : ''}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13 }}>
                        {f.status.toUpperCase()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          {/* CI Runs */}
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 16, color: "#1C2222", marginBottom: 16 }}>CI Activity</h2>
            <div style={{ background: "var(--color-surface)", borderRadius: 8, border: "1px solid #D8E4E4", overflow: 'hidden' }}>
              {ciRuns.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: "#718484" }}>
                  No CI runs ingested yet.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: "#F5F8F8", borderBottom: "1px solid #D8E4E4", textAlign: 'left' }}>
                      <th style={{ padding: "12px 16px", fontSize: 13, color: "#718484", fontWeight: 500 }}>Workflow</th>
                      <th style={{ padding: "12px 16px", fontSize: 13, color: "#718484", fontWeight: 500 }}>Commit</th>
                      <th style={{ padding: "12px 16px", fontSize: 13, color: "#718484", fontWeight: 500 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ciRuns.map((r: any) => (
                      <tr 
                        key={r.id} 
                        onClick={() => { setSelectedCiRunId(r.id); setSelectedFindingId(null); fetchCorrelation(r.id); }}
                        style={{ 
                          borderBottom: "1px solid #D8E4E4", 
                          cursor: 'pointer',
                          background: selectedCiRunId === r.id ? "#F0F5F5" : "transparent"
                        }}
                      >
                        <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 500 }}>{r.workflow}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "#718484", fontFamily: 'monospace' }}>{r.commitSha?.substring(0, 7)}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ 
                            display: 'inline-block', padding: "2px 8px", borderRadius: 4, 
                            fontSize: 12, fontWeight: 600, 
                            color: r.conclusion === 'failure' ? "#DB2424" : "#34C1C1",
                            background: r.conclusion === 'failure' ? "#DB242415" : "#34C1C115"
                          }}>
                            {r.conclusion?.toUpperCase() || r.status?.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          {/* Dependencies */}
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 16, color: "#1C2222", marginBottom: 16 }}>Dependencies</h2>
            <div style={{ background: "var(--color-surface)", borderRadius: 8, border: "1px solid #D8E4E4", padding: 24, display: "flex", gap: 32 }}>
              {depsHistory.length === 0 ? (
                <div style={{ color: "#718484" }}>No dependency snapshots recorded.</div>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1C2222", marginBottom: 12 }}>Package Manager</h3>
                    <div style={{ fontSize: 14, color: "#718484" }}>{depsHistory[0].packageManager || "unknown"}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1C2222", marginBottom: 12 }}>Lockfile</h3>
                    <div style={{ fontSize: 14, color: "#718484" }}>
                      {depsHistory[0].lockfileMissing ? <span style={{ color: "#EC9C13" }}>Missing</span> : <span style={{ color: "#34C1C1" }}>✓ Present</span>}
                      {depsHistory[0].lockfileHash && <div style={{ fontSize: 12, fontFamily: 'monospace', marginTop: 4 }}>SHA: {depsHistory[0].lockfileHash.substring(0, 8)}...</div>}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1C2222", marginBottom: 12 }}>Dependencies</h3>
                    <div style={{ fontSize: 14, color: "#718484" }}>
                      Direct: {Object.keys(depsHistory[0].directDependencies || {}).length}<br />
                      Resolved: {Object.keys(depsHistory[0].resolvedDependencies || {}).length}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Agent Activity */}
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 16, color: "#1C2222", marginBottom: 16 }}>Agent Activity</h2>
            <div style={{ background: "var(--color-surface)", borderRadius: 8, border: "1px solid #D8E4E4", padding: 24 }}>
              {activity.length === 0 ? (
                <div style={{ color: "#718484" }}>No agent activity observed.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {activity.slice(0, 5).map((act: any) => (
                    <div key={act.id} style={{ borderLeft: "2px solid #D8E4E4", paddingLeft: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#1C2222" }}>{act.action}</span>
                        <span style={{ fontSize: 12, color: "#718484" }}>{new Date(act.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "#546666", fontFamily: 'monospace' }}>{act.resource}</div>
                      {act.riskSignals?.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                          {act.riskSignals.map((sig: string) => (
                            <span key={sig} style={{ background: "#DB242415", color: "#DB2424", fontSize: 11, padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                              {sig}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Trust / Permissions */}
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 16, color: "#1C2222", marginBottom: 16 }}>Trust / Permissions</h2>
            <div style={{ background: "var(--color-surface)", borderRadius: 8, border: "1px solid #D8E4E4", padding: 24 }}>
              {decisions.length === 0 ? (
                <div style={{ color: "#718484" }}>No permissions requested yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {decisions.slice(0, 5).map((dec: any) => (
                    <div key={dec.id} style={{ borderLeft: `3px solid ${dec.decision === 'ALLOW' || dec.status === 'APPROVED' ? '#34C1C1' : dec.status === 'REJECTED' || dec.decision === 'BLOCK' ? '#DB2424' : '#EC9C13'}`, paddingLeft: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#1C2222" }}>{dec.action}</span>
                        <span style={{ fontSize: 12, color: "#718484" }}>{new Date(dec.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "#546666", fontFamily: 'monospace' }}>{dec.resource}</div>
                      <div style={{ fontSize: 12, color: "#718484", marginTop: 4 }}>
                        <strong>Policy:</strong> {dec.policyName || 'Default'} <br/>
                        <strong>Reason:</strong> {dec.reason}
                      </div>
                      {dec.decision === 'REQUIRE_APPROVAL' && dec.status === 'PENDING' && (
                        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                          <button onClick={() => handleDecision(dec.id, 'approve')} style={{ background: "#34C1C1", color: "white", border: "none", padding: "6px 16px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Approve</button>
                          <button onClick={() => handleDecision(dec.id, 'reject')} style={{ background: "transparent", color: "#DB2424", border: "1px solid #DB2424", padding: "6px 16px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Reject</button>
                        </div>
                      )}
                      {dec.status !== 'PENDING' && (
                        <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: dec.status === 'APPROVED' ? '#34C1C1' : dec.decision === 'ALLOW' ? '#34C1C1' : '#DB2424' }}>
                          Status: {dec.status} ({dec.decision})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <div style={{ width: 400, flexShrink: 0 }}>
          {selectedFinding ? (
            <div style={{ background: "var(--color-surface)", borderRadius: 8, border: "1px solid #D8E4E4", padding: 24, position: 'sticky', top: 32 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <span style={{ 
                  padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, 
                  color: SEVERITY_COLORS[selectedFinding.severity], background: `${SEVERITY_COLORS[selectedFinding.severity]}15` 
                }}>
                  {selectedFinding.severity.toUpperCase()}
                </span>
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 12, background: "#F5F8F8", color: "#718484" }}>
                  {selectedFinding.category}
                </span>
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 12, background: "#F5F8F8", color: "#718484" }}>
                  Confidence: {Math.round(selectedFinding.confidence * 100)}%
                </span>
              </div>
              <h2 style={{ fontSize: 20, margin: "0 0 16px 0", color: "#1C2222" }}>{selectedFinding.title}</h2>
              <div style={{ fontSize: 13, fontFamily: 'monospace', color: "#718484", marginBottom: 24, padding: "8px 12px", background: "#F5F8F8", borderRadius: 4 }}>
                {selectedFinding.file}{selectedFinding.line ? `:${selectedFinding.line}` : ''}
              </div>
              
              <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: "#9AABAB", letterSpacing: 1, marginBottom: 8 }}>Description</h3>
              <p style={{ fontSize: 14, lineHeight: 1.5, margin: "0 0 24px 0" }}>{selectedFinding.description}</p>
              
              <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: "#9AABAB", letterSpacing: 1, marginBottom: 8 }}>Evidence</h3>
              <div style={{ fontSize: 13, padding: 12, background: "#FDF2F2", borderLeft: "3px solid #DB2424", marginBottom: 24, borderRadius: "0 4px 4px 0" }}>
                {selectedFinding.evidence}
              </div>

              <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: "#9AABAB", letterSpacing: 1, marginBottom: 8 }}>Recommendation</h3>
              <div style={{ fontSize: 13, padding: 12, background: "#F0F9F9", borderLeft: "3px solid #34C1C1", marginBottom: 32, borderRadius: "0 4px 4px 0" }}>
                {selectedFinding.recommendation}
              </div>

              <div style={{ display: 'flex', gap: 12, borderTop: "1px solid #D8E4E4", paddingTop: 24 }}>
                {(selectedFinding.status === 'new' || selectedFinding.status === 'open') ? (
                  <>
                    <button 
                      onClick={() => handleAction(selectedFinding.id, 'resolve')}
                      style={{ padding: "8px 16px", borderRadius: 4, border: "none", background: "#34C1C1", color: "white", fontWeight: 500, cursor: 'pointer' }}
                    >
                      Resolve
                    </button>
                    <button 
                      onClick={() => handleAction(selectedFinding.id, 'ignore')}
                      style={{ padding: "8px 16px", borderRadius: 4, border: "1px solid #D8E4E4", background: "white", color: "#718484", fontWeight: 500, cursor: 'pointer' }}
                    >
                      Ignore
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => handleAction(selectedFinding.id, 'reopen')}
                    style={{ padding: "8px 16px", borderRadius: 4, border: "1px solid #D8E4E4", background: "white", color: "#1C2222", fontWeight: 500, cursor: 'pointer' }}
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>
          ) : selectedCiRun ? (
            <div style={{ background: "var(--color-surface)", borderRadius: 8, border: "1px solid #D8E4E4", padding: 24, position: 'sticky', top: 32 }}>
              <h2 style={{ fontSize: 20, margin: "0 0 16px 0", color: "#1C2222" }}>{selectedCiRun.workflow}</h2>
              <div style={{ fontSize: 13, color: "#718484", marginBottom: 24 }}>
                <strong>Commit:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedCiRun.commitSha}</span><br />
                <strong>Branch:</strong> {selectedCiRun.branch}<br />
                <strong>Started:</strong> {new Date(selectedCiRun.startedAt).toLocaleString()}
              </div>

              {selectedCiRun.jobs?.map((job: any) => (
                <div key={job.id} style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1C2222", marginBottom: 12 }}>
                    Job: {job.name}
                    <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 'normal', color: job.conclusion === 'failure' ? "#DB2424" : "#34C1C1" }}>
                      ({job.conclusion || job.status})
                    </span>
                  </h3>
                  
                  {job.steps?.map((step: any, i: number) => step.failure && (
                    <div key={i} style={{ marginBottom: 16 }}>
                      <h4 style={{ fontSize: 13, color: "#DB2424", marginBottom: 4 }}>Failed Step: {step.name}</h4>
                      <div style={{ fontSize: 13, padding: 12, background: "#FDF2F2", borderLeft: "3px solid #DB2424", borderRadius: "0 4px 4px 0", fontFamily: 'monospace', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                        {step.failure.message}
                        {step.failure.logExcerpt && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #F5C344" }}>
                            {step.failure.logExcerpt}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {selectedCiRunCorrelation && (
                <div style={{ marginTop: 32, borderTop: "1px solid #D8E4E4", paddingTop: 24 }}>
                  <h3 style={{ fontSize: 16, color: "#1C2222", marginBottom: 16 }}>WHY DID THIS HAPPEN?</h3>
                  
                  {selectedCiRunCorrelation.candidates?.length > 0 ? (
                    selectedCiRunCorrelation.candidates.map((cand: any, idx: number) => (
                      <div key={idx} style={{ marginBottom: 24 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 600, color: "#DB2424", marginBottom: 8 }}>Likely contributing factor</h4>
                        <div style={{ fontSize: 14, color: "#1C2222", marginBottom: 12 }}>{cand.title}</div>
                        
                        <h5 style={{ fontSize: 12, color: "#718484", marginBottom: 4, textTransform: 'uppercase' }}>Evidence</h5>
                        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#546666", marginBottom: 12 }}>
                          {cand.evidence.map((ev: string, i: number) => <li key={i}>{ev}</li>)}
                        </ul>

                        <h5 style={{ fontSize: 12, color: "#718484", marginBottom: 4, textTransform: 'uppercase' }}>Confidence</h5>
                        <div style={{ fontSize: 13, color: "#1C2222", marginBottom: 12 }}>{Math.round(cand.confidence * 100)}%</div>

                        <h5 style={{ fontSize: 12, color: "#718484", marginBottom: 4, textTransform: 'uppercase' }}>What to check</h5>
                        <div style={{ fontSize: 13, color: "#1C2222" }}>{cand.recommendation}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 13, color: "#718484" }}>No root cause candidates found. Status: {selectedCiRunCorrelation.status}</div>
                  )}

                  {selectedCiRunCorrelation.timeline?.length > 0 && (
                    <div style={{ marginTop: 24 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 600, color: "#1C2222", marginBottom: 12 }}>Incident Timeline</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {selectedCiRunCorrelation.timeline.map((evt: any, i: number) => (
                          <div key={i} style={{ display: 'flex', gap: 12 }}>
                            <div style={{ width: 60, fontSize: 11, color: "#718484", paddingTop: 2 }}>
                              {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div style={{ flex: 1, borderLeft: "2px solid #D8E4E4", paddingLeft: 12 }}>
                              <div style={{ fontSize: 13, color: evt.type === 'CI_FAILURE' ? "#DB2424" : "#1C2222", fontWeight: 500 }}>
                                {evt.message}
                              </div>
                              {evt.details && <div style={{ fontSize: 12, color: "#718484", marginTop: 2 }}>{evt.details}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: "var(--color-surface)", borderRadius: 8, border: "1px solid #D8E4E4", padding: 48, textAlign: 'center', color: "#9AABAB" }}>
              Select a finding or CI run to view details
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
