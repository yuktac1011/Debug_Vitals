const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getEnvironmentSnapshot } = require('./environment');

function runGitCommand(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe' }).toString().trim();
  } catch (error) {
    return null;
  }
}

function initCommand() {
  console.log('AgentDoctor\n');
  
  const cwd = process.cwd();
  
  const hasGit = fs.existsSync(path.join(cwd, '.git'));
  const gitBranch = hasGit ? runGitCommand('git rev-parse --abbrev-ref HEAD') : null;

  const envSnap = getEnvironmentSnapshot(cwd);

  const displayNode = envSnap.runtime.node ? envSnap.runtime.node : 'unavailable';
  const displayPython = envSnap.runtime.python ? envSnap.runtime.python : 'unavailable';
  const displayJava = envSnap.runtime.java ? envSnap.runtime.java : 'unavailable';
  const displayPkgMgr = envSnap.packageManager ? envSnap.packageManager : 'unavailable';
  const envDetected = envSnap.environmentFiles.present ? envSnap.environmentFiles.files.join(', ') + ' detected' : 'none detected';
  const displayGit = hasGit ? '\u2713' : 'X';

  console.log(`Project       ${envSnap.projectType}`);
  console.log(`OS            ${envSnap.os.platform === 'win32' ? 'Windows' : envSnap.os.platform}`);
  console.log(`Architecture  ${envSnap.os.architecture}`);
  console.log(`Node          ${displayNode}`);
  console.log(`Python        ${displayPython}`);
  console.log(`Java          ${displayJava}`);
  console.log(`Package mgr   ${displayPkgMgr}`);
  console.log(`Environment   ${envDetected}`);
  console.log(`Git           ${displayGit}`);
  if (gitBranch) {
    console.log(`Branch        ${gitBranch}`);
  }

  console.log('\n\u2713 Environment snapshot created');
  console.log('\u2713 Project initialized\n');

  const configDir = path.join(cwd, '.agentdoctor');
  const configFile = path.join(configDir, 'config.json');

  let configContent = {};
  if (fs.existsSync(configFile)) {
    try {
      configContent = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    } catch(e) {}
  } else {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Preserve existing unrelated configuration, update metadata
  configContent.environment = envSnap;
  if (!configContent.initializedAt) {
    configContent.initializedAt = new Date().toISOString();
  }
  // Remove the old simple format fields if they exist to keep it clean, but preserve rest
  delete configContent.projectType;
  delete configContent.runtime;
  delete configContent.files;

  fs.writeFileSync(configFile, JSON.stringify(configContent, null, 2), 'utf-8');
}

module.exports = initCommand;
