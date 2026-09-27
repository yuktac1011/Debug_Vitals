const { ActivityMonitor } = require('./cli/src/activity');

const monitor = new ActivityMonitor(process.cwd());

monitor.recordEvent({
  action: 'COMMAND_EXECUTED',
  resource: 'rm -rf node_modules',
  metadata: { command: 'rm -rf node_modules' },
  source: 'agent'
});

monitor.recordEvent({
  action: 'FILE_WRITE',
  resource: 'src/config/database.js',
  metadata: {},
  source: 'agent'
});

monitor.recordEvent({
  action: 'FILE_WRITE',
  resource: '.env',
  metadata: {},
  source: 'agent'
});

console.log('Test events generated');
