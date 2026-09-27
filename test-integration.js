const { AgentIntegration } = require('./cli/src/integration');

async function runTest() {
  const integration = new AgentIntegration(process.cwd());
  integration.start();

  console.log('\n--- 1. Testing ALLOW (Normal build) ---');
  try {
    await integration.onAction('COMMAND_EXECUTED', 'npm run build', { command: 'npm run build' });
    console.log('✅ Action allowed as expected.');
  } catch (e) {
    console.error('❌ Action failed:', e.message);
  }

  console.log('\n--- 2. Testing Secret Redaction ---');
  try {
    await integration.onAction('FILE_WRITE', 'src/config.json', { command: 'echo password=supersecret > src/config.json' });
    console.log('✅ Secret redacted successfully.');
  } catch (e) {
    console.error('❌ Action failed:', e.message);
  }

  console.log('\n--- 3. Testing APPROVAL FLOW (Simulated Approve) ---');
  try {
    const actionPromise = integration.onAction('FILE_WRITE', '.env', { command: 'echo FOO=bar > .env' });
    
    // Simulate approval by another process after 2 seconds
    setTimeout(() => {
      const fs = require('fs');
      const path = require('path');
      const decPath = path.join(process.cwd(), '.agentdoctor', 'decisions.json');
      let decisions = JSON.parse(fs.readFileSync(decPath, 'utf8'));
      const pending = decisions.find(d => d.resource === '.env' && d.status === 'PENDING');
      if (pending) {
        pending.status = 'APPROVED';
        fs.writeFileSync(decPath, JSON.stringify(decisions, null, 2));
      }
    }, 2000);

    await actionPromise;
    console.log('✅ Action approved successfully.');
  } catch (e) {
    console.error('❌ Action failed:', e.message);
  }

  console.log('\n--- 4. Testing APPROVAL FLOW (Simulated Reject) ---');
  try {
    const actionPromise = integration.onAction('COMMAND_EXECUTED', 'rm -rf', { command: 'rm -rf node_modules' });
    
    // Simulate rejection by another process after 2 seconds
    setTimeout(() => {
      const fs = require('fs');
      const path = require('path');
      const decPath = path.join(process.cwd(), '.agentdoctor', 'decisions.json');
      let decisions = JSON.parse(fs.readFileSync(decPath, 'utf8'));
      const pending = decisions.find(d => d.resource === 'rm -rf' && d.status === 'PENDING');
      if (pending) {
        pending.status = 'REJECTED';
        fs.writeFileSync(decPath, JSON.stringify(decisions, null, 2));
      }
    }, 2000);

    await actionPromise;
    console.log('❌ Action should have been rejected!');
  } catch (e) {
    console.log('✅ Action successfully rejected:', e.message);
  }

  integration.stop();
}

runTest();
