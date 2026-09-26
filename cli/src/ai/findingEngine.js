const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];
const VALID_CATEGORIES = ['bug', 'security', 'reliability', 'performance', 'configuration', 'maintainability'];

class FindingEngine {
  constructor(cwd) {
    this.cwd = cwd;
    this.findingsFile = path.join(cwd, '.agentdoctor', 'findings.json');
    this.findings = new Map(); // id -> finding
    this.loadFindings();
  }

  loadFindings() {
    if (fs.existsSync(this.findingsFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.findingsFile, 'utf-8'));
        if (Array.isArray(data)) {
          for (const f of data) {
            this.findings.set(f.id, f);
          }
        }
      } catch (err) {
        // Ignore read errors
      }
    }
  }

  saveFindings() {
    try {
      const data = Array.from(this.findings.values());
      const dir = path.dirname(this.findingsFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.findingsFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      // Ignore write errors
    }
  }

  normalizeSeverity(severity) {
    const s = (severity || '').toLowerCase();
    if (VALID_SEVERITIES.includes(s)) return s;
    if (['warning', 'important', 'urgent', 'severe'].includes(s)) return 'high';
    return 'info';
  }

  normalizeCategory(category) {
    const c = (category || '').toLowerCase();
    if (VALID_CATEGORIES.includes(c)) return c;
    return 'maintainability';
  }

  generateFindingId(finding) {
    const hash = crypto.createHash('sha256');
    const normalizedTitle = finding.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const lineStr = finding.line ? Math.floor(finding.line / 10).toString() : 'none'; // Approximate location
    
    // stable ID based on file, category, title, approx line
    hash.update(`${finding.file}|${this.normalizeCategory(finding.category)}|${normalizedTitle}|${lineStr}`);
    return `finding_${hash.digest('hex').substring(0, 16)}`;
  }

  processAnalysis(aiFindings, analyzedFiles) {
    const now = Date.now();
    const newFindingsList = [];
    const resolvedFindingsList = [];

    // 1. Deduplicate & Update within the new batch
    const incomingMap = new Map();
    for (const raw of aiFindings) {
      const id = this.generateFindingId(raw);
      if (!incomingMap.has(id)) {
        incomingMap.set(id, raw);
      } else {
        // Simple deduplication strategy within same batch: take highest confidence
        const existing = incomingMap.get(id);
        if ((raw.confidence || 0) > (existing.confidence || 0)) {
          incomingMap.set(id, raw);
        }
      }
    }

    // 2. Merge into state
    for (const [id, raw] of incomingMap.entries()) {
      const severity = this.normalizeSeverity(raw.severity);
      const category = this.normalizeCategory(raw.category);
      
      if (this.findings.has(id)) {
        const existing = this.findings.get(id);
        if (existing.status === 'resolved' || existing.status === 'ignored') {
           // If it was resolved but found again, it's open again unless ignored
           if (existing.status !== 'ignored') {
             existing.status = 'open';
           }
        } else {
           existing.status = 'open';
        }
        
        existing.lastSeen = now;
        existing.confidence = raw.confidence;
        existing.evidence = raw.evidence;
        existing.description = raw.description;
        existing.recommendation = raw.recommendation;
        existing.line = raw.line;
        
      } else {
        const newFinding = {
          id,
          title: raw.title,
          severity,
          category,
          confidence: raw.confidence,
          file: raw.file,
          line: raw.line,
          description: raw.description,
          evidence: raw.evidence,
          recommendation: raw.recommendation,
          status: 'new',
          firstSeen: now,
          lastSeen: now
        };
        this.findings.set(id, newFinding);
        newFindingsList.push(newFinding);
      }
    }

    // 3. Resolve missing findings
    // If a finding was in an analyzed file, but not in the incoming findings, mark as resolved
    for (const [id, f] of this.findings.entries()) {
      if (f.status === 'new' || f.status === 'open') {
        if (analyzedFiles.includes(f.file) && !incomingMap.has(id)) {
          f.status = 'resolved';
          resolvedFindingsList.push(f);
        } else if (f.status === 'new') {
          // Transition new to open if not just created
          if (!newFindingsList.find(n => n.id === id)) {
            f.status = 'open';
          }
        }
      }
    }

    this.saveFindings();

    return {
      newFindings: newFindingsList,
      resolvedFindings: resolvedFindingsList
    };
  }

  getRiskSummary() {
    const summary = {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      open: 0,
      resolved: 0,
      ignored: 0
    };

    for (const f of this.findings.values()) {
      summary.total++;
      if (f.status === 'new' || f.status === 'open') {
        summary.open++;
        summary[f.severity]++;
      } else if (f.status === 'resolved') {
        summary.resolved++;
      } else if (f.status === 'ignored') {
        summary.ignored++;
      }
    }

    return summary;
  }

  groupFindings() {
    const byFile = {};
    const byCategory = {};
    const bySeverity = { critical: [], high: [], medium: [], low: [], info: [] };

    for (const f of this.findings.values()) {
      if (f.status === 'resolved' || f.status === 'ignored') continue;

      if (!byFile[f.file]) byFile[f.file] = [];
      byFile[f.file].push(f);

      if (!byCategory[f.category]) byCategory[f.category] = [];
      byCategory[f.category].push(f);

      if (bySeverity[f.severity]) {
        bySeverity[f.severity].push(f);
      }
    }

    return { byFile, byCategory, bySeverity };
  }
}

module.exports = { FindingEngine };
