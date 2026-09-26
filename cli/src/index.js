#!/usr/bin/env node

const initCommand = require('./init');
const watchCommand = require('./watch');
const packageJson = require('../package.json');

const args = process.argv.slice(2);

function showHelp() {
  console.log('AgentDoctor');
  console.log('Diagnose the cause, not just the symptom.\n');
  console.log('Usage: agentdoctor <command>\n');
  console.log('Commands:');
  console.log('  init       Initialize AgentDoctor in the current repository');
  console.log('  watch      Monitor the repository for meaningful events');
  console.log('\nOptions:');
  console.log('  --help     Show this help message');
  console.log('  --version  Show version number');
}

function showWatchHelp() {
  console.log('Usage: agentdoctor watch\n');
  console.log('Monitor the current repository and record meaningful development events (file changes).');
}

function showVersion() {
  console.log(packageJson.version);
}

function main() {
  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const command = args[0];

  switch (command) {
    case 'init':
      initCommand();
      break;
    case 'watch':
      if (args[1] === '--help' || args[1] === '-h') {
        showWatchHelp();
      } else {
        watchCommand();
      }
      break;
    case '--help':
    case '-h':
      showHelp();
      break;
    case '--version':
    case '-v':
      showVersion();
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      showHelp();
      process.exit(1);
  }
}

main();