const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function runGitCommand(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe' }).toString().trim();
  } catch (error) {
    return null;
  }
}

function watchCommand() {
  const cwd = process.cwd();
  const configDir = path.join(cwd, '.agentdoctor');
  const configFile = path.join(configDir, 'config.json');

  if (!fs.existsSync(configFile)) {
    console.error('Error: AgentDoctor is not initialized in this directory.');
    console.error('Run "agentdoctor init" first.');
    process.exit(1);
  }

  if (!fs.existsSync(path.join(cwd, '.git'))) {
    console.error('Error: This is not a Git repository.');
    process.exit(1);
  }

  const gitBranch = runGitCommand('git rev-parse --abbrev-ref HEAD') || 'unknown';

  console.log('AgentDoctor watching...\n');

  // Handle Ctrl+C cleanly
  process.on('SIGINT', () => {
    console.log('\nAgentDoctor stopped.');
    process.exit(0);
  });

  const ignoredPrefixes = [
    '.git',
    'node_modules',
    '.agentdoctor',
    '.next',
    'dist',
    'build',
    'out'
  ];

  const recentEvents = new Set();

  try {
    fs.watch(cwd, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      // Normalize path to use forward slashes for matching
      const normalizedPath = filename.replace(/\\/g, '/');
      
      const shouldIgnore = ignoredPrefixes.some(prefix => 
        normalizedPath === prefix || normalizedPath.startsWith(prefix + '/')
      );

      if (shouldIgnore) return;

      // Debounce events to prevent duplicate firing common with fs.watch
      const eventKey = `${eventType}:${filename}`;
      if (recentEvents.has(eventKey)) return;

      recentEvents.add(eventKey);
      setTimeout(() => recentEvents.delete(eventKey), 100);

      const now = new Date();
      // Format time as HH:MM:SS
      const timeString = now.toTimeString().split(' ')[0];

      // Internal event structure
      const eventObj = {
        type: 'file_changed',
        timestamp: now.toISOString(),
        file: filename,
        branch: gitBranch
      };

      // Print to terminal
      console.log(`${timeString}  FILE_CHANGED  ${filename}`);
    });
  } catch (error) {
    console.error('Failed to start file watcher:', error.message);
    process.exit(1);
  }
}

module.exports = watchCommand;
