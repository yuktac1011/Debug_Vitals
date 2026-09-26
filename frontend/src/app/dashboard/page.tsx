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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filterSeverity, setFilterSeverity] = useState('All')
  const [filterStatus, setFilterStatus] = useState('open')
  
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/agentdoctor')
      if (!res.ok) throw new Error('Failed to load data')
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [])

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: "#34C1C1" }}>●</span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Watching</span>
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
          ) : (
            <div style={{ background: "var(--color-surface)", borderRadius: 8, border: "1px solid #D8E4E4", padding: 48, textAlign: 'center', color: "#9AABAB" }}>
              Select a finding to view details
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
