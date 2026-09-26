const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function safeExec(cmd) {
  try {
    const output = execSync(cmd, { stdio: 'pipe' }).toString().trim();
    return output ? output : null;
  } catch (err) {
    return null;
  }
}

function detectOS() {
  return {
    platform: os.platform(),
    release: os.release(),
    architecture: os.arch(),
    hostname: os.hostname()
  };
}

function detectRuntimes() {
  const node = safeExec('node --version');
  
  let python = safeExec('python --version');
  if (!python) python = safeExec('python3 --version');

  let java = null;
  try {
    const javaOut = execSync('java -version 2>&1', { stdio: 'pipe' }).toString();
    const match = javaOut.match(/version "(.*?)"/);
    if (match) java = match[1];
  } catch (e) {}

  const npm = safeExec('npm --version');
  const pnpm = safeExec('pnpm --version');
  const yarn = safeExec('yarn --version');

  return { node, python, java, npm, pnpm, yarn };
}

function detectProject(cwd) {
  let files = [];
  try {
    files = fs.readdirSync(cwd);
  } catch (err) { }
  
  const hasPackageJson = files.includes('package.json');
  const hasRequirements = files.includes('requirements.txt');
  const hasPyproject = files.includes('pyproject.toml');
  const hasPomXml = files.includes('pom.xml');
  const hasGoMod = files.includes('go.mod');
  const hasCargoToml = files.includes('Cargo.toml');

  if (hasPackageJson) return 'Node.js';
  if (hasRequirements || hasPyproject) return 'Python';
  if (hasPomXml) return 'Java';
  if (hasGoMod) return 'Go';
  if (hasCargoToml) return 'Rust';
  
  return 'unknown';
}

function detectPackageManager(cwd, runtimes) {
  const hasPackageLock = fs.existsSync(path.join(cwd, 'package-lock.json'));
  const hasPnpmLock = fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'));
  const hasYarnLock = fs.existsSync(path.join(cwd, 'yarn.lock'));

  if (hasPackageLock) return 'npm';
  if (hasPnpmLock) return 'pnpm';
  if (hasYarnLock) return 'yarn';

  if (runtimes.npm) return 'npm';
  if (runtimes.pnpm) return 'pnpm';
  if (runtimes.yarn) return 'yarn';

  return null;
}

function detectEnvironmentFiles(cwd) {
  let files = [];
  try {
    files = fs.readdirSync(cwd);
  } catch (err) {}
  
  const envFileNames = ['.env', '.env.local', '.env.development', '.env.production', '.env.test'];
  const present = files.filter(f => envFileNames.includes(f));
  
  return {
    present: present.length > 0,
    files: present
  };
}

function detectConfigFiles(cwd) {
  let files = [];
  try {
    files = fs.readdirSync(cwd);
  } catch (err) {}
  
  const configNames = ['package.json', 'requirements.txt', 'pyproject.toml', 'pom.xml', 'build.gradle', 'go.mod', 'Cargo.toml'];
  return files.filter(f => configNames.includes(f));
}

function detectShell() {
  return process.env.SHELL || process.env.COMSPEC || null;
}

function getEnvironmentSnapshot(cwd = process.cwd()) {
  const osInfo = detectOS();
  const runtimes = detectRuntimes();
  const projectType = detectProject(cwd);
  const packageManager = detectPackageManager(cwd, runtimes);
  const environmentFiles = detectEnvironmentFiles(cwd);
  const configFiles = detectConfigFiles(cwd);
  const shell = detectShell();

  return {
    timestamp: new Date().toISOString(),
    os: osInfo,
    runtime: runtimes,
    shell,
    projectType,
    packageManager,
    environmentFiles,
    configFiles
  };
}

module.exports = {
  getEnvironmentSnapshot,
  detectOS,
  detectRuntimes,
  detectProject,
  detectPackageManager,
  detectEnvironmentFiles,
  detectConfigFiles,
  detectShell
};
