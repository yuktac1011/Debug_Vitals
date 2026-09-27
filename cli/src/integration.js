const { ActivityMonitor } = require('./activity');

class AgentIntegration {
  constructor(cwd) {
    this.monitor = new ActivityMonitor(cwd);
    this.active = false;
  }

  start() {
    this.active = true;
    console.log('AgentIntegration started.');
  }

  stop() {
    this.active = false;
    console.log('AgentIntegration stopped.');
  }

  /**
   * Called when an agent attempts an action.
   * Returns a promise that resolves when the action is allowed, 
   * or rejects if blocked.
   */
  async onAction(action, resource, metadata = {}) {
    if (!this.active) return true; // Fail open if integration inactive

    // Use our activity monitor which internally evaluates policy
    const event = this.monitor.recordEvent({
      action,
      resource,
      source: 'agent_integration',
      metadata
    });

    const { decision } = event;

    if (decision === 'ALLOW') {
      return true;
    }

    if (decision === 'WARN') {
      console.warn(`[WARN] Action ${action} on ${resource} is allowed but flagged.`);
      return true;
    }

    if (decision === 'BLOCK') {
      throw new Error(`[BLOCK] Action ${action} on ${resource} was blocked by policy.`);
    }

    if (decision === 'REQUIRE_APPROVAL') {
      console.log(`[APPROVAL_REQUIRED] Action ${action} on ${resource} requires approval. Waiting...`);
      
      // Poll for approval status
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 60; // 1 minute timeout (60 * 1000ms)

        const interval = setInterval(() => {
          attempts++;
          this.monitor.policyEngine.loadData(); // reload decisions from disk
          
          const dec = this.monitor.policyEngine.decisions.find(d => d.id === event.decisionId || (d.action === action && d.resource === resource && d.status !== 'PENDING'));
          
          if (dec && dec.status === 'APPROVED') {
            clearInterval(interval);
            console.log(`[APPROVED] Action ${action} on ${resource} was approved.`);
            resolve(true);
          } else if (dec && dec.status === 'REJECTED') {
            clearInterval(interval);
            reject(new Error(`[REJECTED] Action ${action} on ${resource} was rejected by user.`));
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            reject(new Error(`[TIMEOUT] Action ${action} on ${resource} approval timed out.`));
          }
        }, 1000);
      });
    }

    return true;
  }
}

module.exports = { AgentIntegration };
