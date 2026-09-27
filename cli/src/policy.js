const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

const DEFAULT_POLICIES = [
  { id: 'pol_1', name: 'Protect Secrets', action: 'ANY', resource: '.env', effect: 'REQUIRE_APPROVAL', enabled: true },
  { id: 'pol_2', name: 'Protect Credentials', action: 'ANY', resource: 'credentials', effect: 'REQUIRE_APPROVAL', enabled: true },
  { id: 'pol_3', name: 'Protect Keys', action: 'ANY', resource: 'id_rsa', effect: 'REQUIRE_APPROVAL', enabled: true },
  { id: 'pol_4', name: 'Destructive Commands', action: 'COMMAND_EXECUTED', resource: 'rm -rf', effect: 'REQUIRE_APPROVAL', enabled: true },
  { id: 'pol_5', name: 'Database Writes', action: 'DATABASE_WRITE', resource: '*', effect: 'REQUIRE_APPROVAL', enabled: true },
  { id: 'pol_6', name: 'Cloud Actions', action: 'CLOUD_ACTION', resource: '*', effect: 'REQUIRE_APPROVAL', enabled: true },
  { id: 'pol_7', name: 'Normal Source Edits', action: 'FILE_WRITE', resource: 'src/', effect: 'ALLOW', enabled: true },
  { id: 'pol_8', name: 'Normal Tests', action: 'COMMAND_EXECUTED', resource: 'npm test', effect: 'ALLOW', enabled: true },
  { id: 'pol_9', name: 'Normal Build', action: 'COMMAND_EXECUTED', resource: 'npm run build', effect: 'ALLOW', enabled: true }
];

class PolicyEngine {
  constructor(cwd) {
    this.cwd = cwd;
    this.policiesFile = path.join(cwd, '.agentdoctor', 'policies.json');
    this.decisionsFile = path.join(cwd, '.agentdoctor', 'decisions.json');
    this.policies = [];
    this.decisions = [];
    this.loadData();
  }

  loadData() {
    if (fs.existsSync(this.policiesFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.policiesFile, 'utf8'));
        this.policies = Array.isArray(data) && data.length > 0 ? data : [...DEFAULT_POLICIES];
      } catch (e) {
        this.policies = [...DEFAULT_POLICIES];
      }
    } else {
      this.policies = [...DEFAULT_POLICIES];
      this.savePolicies();
    }

    if (fs.existsSync(this.decisionsFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.decisionsFile, 'utf8'));
        this.decisions = Array.isArray(data) ? data : [];
      } catch (e) {
        this.decisions = [];
      }
    }
  }

  savePolicies() {
    try {
      const dir = path.dirname(this.policiesFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.policiesFile, JSON.stringify(this.policies, null, 2), 'utf8');
    } catch (e) {}
  }

  saveDecisions() {
    try {
      const dir = path.dirname(this.decisionsFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.decisionsFile, JSON.stringify(this.decisions, null, 2), 'utf8');
    } catch (e) {}
  }

  evaluateAction(action, resource) {
    let finalDecision = 'ALLOW';
    let triggeredPolicy = null;

    for (const policy of this.policies) {
      if (!policy.enabled) continue;
      
      const actionMatches = policy.action === 'ANY' || policy.action === action;
      // Resource matching (basic includes or wildcards)
      const resourceMatches = policy.resource === '*' || resource.includes(policy.resource);

      if (actionMatches && resourceMatches) {
        finalDecision = policy.effect;
        triggeredPolicy = policy;
        break; // Match first matching policy
      }
    }

    let reason = 'Default ALLOW policy (No specific rule matched)';
    if (triggeredPolicy) {
      reason = `Matched policy: ${triggeredPolicy.name} which enforces ${triggeredPolicy.effect}`;
    }

    const decisionRecord = {
      id: generateId(),
      action,
      resource,
      decision: finalDecision,
      policyId: triggeredPolicy ? triggeredPolicy.id : null,
      policyName: triggeredPolicy ? triggeredPolicy.name : null,
      reason,
      status: finalDecision === 'REQUIRE_APPROVAL' ? 'PENDING' : 'RESOLVED',
      timestamp: new Date().toISOString()
    };

    this.decisions.push(decisionRecord);
    if (this.decisions.length > 500) this.decisions.shift();
    this.saveDecisions();

    return decisionRecord;
  }
}

module.exports = { PolicyEngine };
