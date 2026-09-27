const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function redactSecrets(text) {
  if (!text) return text;
  // Basic redaction of typical secret patterns
  let redacted = text.replace(/(?:password|secret|token|key|auth|api_key|access_token)[\s:=]+([^\s,;'"}{]+)/gi, (match, p1) => {
    return match.replace(p1, '***REDACTED***');
  });
  // Also redact anything looking like a bearer token
  redacted = redacted.replace(/Bearer\s+[a-zA-Z0-9\-_.]+/gi, 'Bearer ***REDACTED***');
  return redacted;
}

function truncateLog(logStr, maxLines = 50) {
  if (!logStr) return logStr;
  const lines = logStr.split('\n');
  if (lines.length <= maxLines) return logStr;
  
  // Keep first 10 lines, and last (maxLines - 10) lines
  const head = lines.slice(0, 10).join('\n');
  const tail = lines.slice(lines.length - (maxLines - 10)).join('\n');
  return `${head}\n\n...[truncated ${lines.length - maxLines} lines]...\n\n${tail}`;
}

class CIEngine {
  constructor(cwd) {
    this.cwd = cwd;
    this.runsFile = path.join(cwd, '.agentdoctor', 'ci_runs.json');
    this.runs = new Map();
    this.loadRuns();
  }

  loadRuns() {
    if (fs.existsSync(this.runsFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.runsFile, 'utf-8'));
        if (Array.isArray(data)) {
          for (const r of data) {
            this.runs.set(r.id, r);
          }
        }
      } catch (e) {
        console.error('Error loading CI runs:', e);
      }
    }
  }

  saveRuns() {
    try {
      const data = Array.from(this.runs.values());
      const dir = path.dirname(this.runsFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.runsFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving CI runs:', e);
    }
  }

  ingestRun(normalizedRun) {
    // Redact sensitive info
    for (const job of normalizedRun.jobs || []) {
      for (const step of job.steps || []) {
        if (step.failure) {
          step.failure.message = redactSecrets(step.failure.message);
          step.failure.logExcerpt = redactSecrets(truncateLog(step.failure.logExcerpt));
        }
      }
    }
    this.runs.set(normalizedRun.id, normalizedRun);
    this.saveRuns();
    return normalizedRun;
  }
}

module.exports = { CIEngine, redactSecrets, truncateLog };
