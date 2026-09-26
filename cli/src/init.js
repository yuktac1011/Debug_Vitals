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

function detectProject(cwd) {
  let files = [];
  try {
    files = fs.readdirSync(cwd);
  } catch (err) {
    // Cannot read directory
  }
  
  const hasGit = fs.existsSync(path.join(cwd, '.git'));
  
  // Detect files
  const hasPackageJson = files.includes('package.json');
  const hasPackageLock = files.includes('package-lock.json');
  const hasYarnLock = files.includes('yarn.lock');
  const hasPnpmLock = files.includes('pnpm-lock.yaml');
  const hasRequirements = files.includes('requirements.txt');
  const hasPyproject = files.includes('pyproject.toml');
  const hasPomXml = files.includes('pom.xml');

  // Detect type
  let projectType = 'Unknown';
  if (hasPackageJson) {
    projectType = 'Node.js';
  } else if (hasRequirements || hasPyproject) {
    projectType = 'Python';
  } else if (hasPomXml) {
    projectType = 'Java';
  }

  // Detect runtime
  let runtime = 'Unknown';
  try {
    if (projectType === 'Node.js') {
      runtime = execSync('node --version', { stdio: 'pipe' }).toString().trim();
    } else if (projectType === 'Python') {
      try {
        runtime = execSync('python --version', { stdio: 'pipe' }).toString().trim();
      } catch (e) {
        runtime = execSync('python3 --version', { stdio: 'pipe' }).toString().trim();
      }
    } else if (projectType === 'Java') {
      const output = execSync('java -version 2>&1', { stdio: 'pipe' }).toString();
      const match = output.match(/version "(.*?)"/);
      if (match) runtime = match[1];
    }
  } catch(e) {
     // Ignore runtime detection failure
  }

  const gitBranch = hasGit ? runGitCommand('git rev-parse --abbrev-ref HEAD') : null;

  const foundFiles = [];
  if (hasPackageJson) foundFiles.push('package.json');
  if (hasPackageLock) foundFiles.push('package-lock.json');
  if (hasYarnLock) foundFiles.push('yarn.lock');
  if (hasPnpmLock) foundFiles.push('pnpm-lock.yaml');
  if (hasRequirements) foundFiles.push('requirements.txt');
  if (hasPyproject) foundFiles.push('pyproject.toml');
  if (hasPomXml) foundFiles.push('pom.xml');

  return {
    hasGit,
    gitBranch,
    projectType,
    foundFiles,
    runtime
  };
}

function initCommand() {
  console.log('AgentDoctor\n');
  
  const cwd = process.cwd();
  const info = detectProject(cwd);

  if (info.projectType !== 'Unknown' || info.hasGit) {
    console.log('Project detected');
    if (info.hasGit) console.log('\u2713 Git repository');
    if (info.projectType !== 'Unknown') console.log(`\u2713 ${info.projectType} project`);
    info.foundFiles.forEach(f => console.log(`\u2713 ${f}`));
    if (info.gitBranch) console.log(`\u2713 Git branch: ${info.gitBranch}`);
    if (info.runtime !== 'Unknown') console.log(`\u2713 Runtime: ${info.runtime}`);
  } else {
    console.log('No specific project type detected.');
  }

  console.log('\nAgentDoctor initialized.\n');

  const configDir = path.join(cwd, '.agentdoctor');
  const configFile = path.join(configDir, 'config.json');

  if (fs.existsSync(configFile)) {
    console.log('Configuration already exists at .agentdoctor/config.json. Skipping creation.');
    return;
  }

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const configContent = {
    projectType: info.projectType,
    runtime: info.runtime,
    files: info.foundFiles,
    initializedAt: new Date().toISOString()
  };

  fs.writeFileSync(configFile, JSON.stringify(configContent, null, 2), 'utf-8');
  console.log('Configuration:\n.agentdoctor/config.json');
}

module.exports = initCommand;
