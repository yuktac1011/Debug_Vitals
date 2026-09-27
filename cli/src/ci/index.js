const fs = require('fs');
const path = require('path');
const { CIEngine } = require('./engine');
const { GitHubActionsProvider } = require('./providers/github');

function ciCommand(args) {
  if (args.length < 2 || args[0] !== 'ingest') {
    console.log('Usage: agentdoctor ci ingest <payload.json> [--provider github]');
    process.exit(1);
  }

  const payloadPath = path.resolve(process.cwd(), args[1]);
  if (!fs.existsSync(payloadPath)) {
    console.error(`Error: Payload file not found: ${payloadPath}`);
    process.exit(1);
  }

  let providerName = 'github';
  const providerIndex = args.indexOf('--provider');
  if (providerIndex !== -1 && args.length > providerIndex + 1) {
    providerName = args[providerIndex + 1];
  }

  let provider;
  if (providerName === 'github') {
    provider = new GitHubActionsProvider();
  } else {
    console.error(`Error: Unsupported CI provider: ${providerName}`);
    process.exit(1);
  }

  try {
    const payloadContent = fs.readFileSync(payloadPath, 'utf8');
    const payload = JSON.parse(payloadContent);

    const normalizedRun = provider.parse(payload);
    
    const engine = new CIEngine(process.cwd());
    engine.ingestRun(normalizedRun);
    
    console.log(`Successfully ingested CI run: ${normalizedRun.id}`);
  } catch (err) {
    console.error('Error processing CI payload:', err.message);
    process.exit(1);
  }
}

module.exports = ciCommand;
