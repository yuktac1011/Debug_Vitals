const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

function redactCommand(cmd) {
  if (!cmd) return cmd;
  let redacted = cmd.replace(/(?:password|secret|token|key|auth)=([^\s,;'"}{]+)/gi, (match, p1) => {
    return match.replace(p1, '***REDACTED***');
  });
  return redacted;
}

function evaluateRiskSignals(action, resource, metadata) {
  const signals = [];
  const sensitiveFiles = ['.env', 'credentials', 'config.json', 'id_rsa', 'secret'];

  if (action === 'FILE_WRITE' || action === 'FILE_READ' || action === 'FILE_DELETE') {
    if (sensitiveFiles.some(sf => resource.includes(sf))) {
      signals.push('SENSITIVE_FILE');
    }
  }

  if (action === 'COMMAND_EXECUTED') {
    const cmd = metadata?.command || '';
    if (cmd.includes('rm -rf') || cmd.includes('drop database')) {
      signals.push('DESTRUCTIVE_COMMAND');
    }
    if (cmd.includes('npm install') || cmd.includes('pip install') || cmd.includes('yarn add')) {
      signals.push('PACKAGE_INSTALL');
    }
    if (cmd.includes('aws ') || cmd.includes('gcloud ') || cmd.includes('azure ')) {
      signals.push('CLOUD_ACTION');
    }
    if (cmd.includes('curl ') || cmd.includes('wget ') || cmd.includes('ssh ')) {
      signals.push('EXTERNAL_NETWORK');
    }
  }

  return signals;
}

const { PolicyEngine } = require('./policy');

class ActivityMonitor {
  constructor(cwd) {
    this.cwd = cwd;
    this.activityFile = path.join(cwd, '.agentdoctor', 'activity.json');
    this.events = [];
    this.policyEngine = new PolicyEngine(cwd);
    this.loadEvents();
  }

  loadEvents() {
    if (fs.existsSync(this.activityFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.activityFile, 'utf8'));
        this.events = Array.isArray(data) ? data : [];
      } catch (e) {
        this.events = [];
      }
    }
  }

  saveEvents() {
    try {
      const dir = path.dirname(this.activityFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.activityFile, JSON.stringify(this.events, null, 2), 'utf8');
    } catch (e) {}
  }

  recordEvent(params) {
    const { action, resource, metadata = {}, source = 'unknown' } = params;
    
    if (metadata.command) {
      metadata.command = redactCommand(metadata.command);
    }
    if (metadata.output) {
      metadata.output = redactCommand(metadata.output).substring(0, 1000); // bounded output
    }

    const riskSignals = evaluateRiskSignals(action, resource, metadata);
    const decision = this.policyEngine.evaluateAction(action, resource);

    const event = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      actor: 'agent',
      action,
      resource,
      source,
      status: metadata.status || 'success',
      decision: decision.decision,
      metadata,
      riskSignals
    };

    this.events.push(event);
    if (this.events.length > 500) this.events.shift(); // Keep bounded

    this.saveEvents();
    return event;
  }
}

module.exports = { ActivityMonitor };
