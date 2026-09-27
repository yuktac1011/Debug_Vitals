const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getGitMetadata } = require('./snapshot');
const { detectPackageManager, detectProject } = require('./environment');

function hashFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Basic parsing functions
function parsePackageJson(cwd) {
  const filePath = path.join(cwd, 'package.json');
  if (!fs.existsSync(filePath)) return { direct: {}, name: 'unknown' };
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      name: data.name || 'unknown',
      direct: { ...data.dependencies, ...data.devDependencies }
    };
  } catch (e) {
    return { direct: {}, name: 'unknown' };
  }
}

function parsePackageLockJson(cwd) {
  const filePath = path.join(cwd, 'package-lock.json');
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const resolved = {};
    if (data.packages) {
      for (const [pkgPath, pkg] of Object.entries(data.packages)) {
        if (!pkgPath) continue; // skip root
        const name = pkgPath.replace(/^node_modules\//, '');
        resolved[name] = pkg.version;
      }
    } else if (data.dependencies) {
      for (const [name, pkg] of Object.entries(data.dependencies)) {
        resolved[name] = pkg.version;
      }
    }
    return resolved;
  } catch (e) {
    return null;
  }
}

function parseRequirementsTxt(cwd) {
  const filePath = path.join(cwd, 'requirements.txt');
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const deps = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/==|>=|<=|~=|>|</);
    if (parts.length > 0) {
      deps[parts[0].trim()] = parts.length > 1 ? parts[1].trim() : 'latest';
    }
  }
  return deps;
}

function buildDependencySnapshot(cwd = process.cwd()) {
  const projectType = detectProject(cwd);
  let packageManager = detectPackageManager(cwd, {}); // simplified

  let manifestFiles = [];
  let lockfileFiles = [];
  let directDependencies = {};
  let resolvedDependencies = {};
  let lockfileHash = null;
  let status = "ok";
  let lockfileMissing = false;

  if (projectType === 'Node.js') {
    manifestFiles.push('package.json');
    const { direct } = parsePackageJson(cwd);
    directDependencies = direct;

    if (fs.existsSync(path.join(cwd, 'package-lock.json'))) {
      lockfileFiles.push('package-lock.json');
      resolvedDependencies = parsePackageLockJson(cwd) || {};
      lockfileHash = hashFile(path.join(cwd, 'package-lock.json'));
      packageManager = 'npm';
    } else if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
      lockfileFiles.push('pnpm-lock.yaml');
      lockfileHash = hashFile(path.join(cwd, 'pnpm-lock.yaml'));
      packageManager = 'pnpm';
    } else if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
      lockfileFiles.push('yarn.lock');
      lockfileHash = hashFile(path.join(cwd, 'yarn.lock'));
      packageManager = 'yarn';
    } else {
      lockfileMissing = true;
    }
  } else if (projectType === 'Python') {
    if (fs.existsSync(path.join(cwd, 'requirements.txt'))) {
      manifestFiles.push('requirements.txt');
      directDependencies = parseRequirementsTxt(cwd) || {};
      packageManager = 'pip';
      lockfileMissing = true; // pip usually doesn't have a strict lockfile unless it's compiled
    }
    if (fs.existsSync(path.join(cwd, 'poetry.lock'))) {
      lockfileFiles.push('poetry.lock');
      lockfileHash = hashFile(path.join(cwd, 'poetry.lock'));
      packageManager = 'poetry';
      lockfileMissing = false;
    }
    if (fs.existsSync(path.join(cwd, 'uv.lock'))) {
      lockfileFiles.push('uv.lock');
      lockfileHash = hashFile(path.join(cwd, 'uv.lock'));
      packageManager = 'uv';
      lockfileMissing = false;
    }
  } else {
    status = "unsupported";
  }

  return {
    timestamp: new Date().toISOString(),
    packageManager,
    manifestFiles,
    lockfileFiles,
    directDependencies,
    resolvedDependencies,
    lockfileHash,
    status,
    lockfileMissing
  };
}

function compareDependencies(previous, current) {
  const changes = [];
  
  if (previous.lockfileHash !== current.lockfileHash) {
    changes.push({ type: 'LOCKFILE_CHANGED' });
  }
  if (previous.packageManager !== current.packageManager) {
    changes.push({ type: 'PACKAGE_MANAGER_MISMATCH', previous: previous.packageManager, current: current.packageManager });
  }

  const allDirect = new Set([...Object.keys(previous.directDependencies || {}), ...Object.keys(current.directDependencies || {})]);
  
  for (const dep of allDirect) {
    const pVer = previous.directDependencies[dep];
    const cVer = current.directDependencies[dep];
    
    if (pVer && !cVer) changes.push({ type: 'REMOVED', name: dep, source: 'direct', previous: pVer });
    else if (!pVer && cVer) changes.push({ type: 'ADDED', name: dep, source: 'direct', current: cVer });
    else if (pVer !== cVer) changes.push({ type: 'VERSION_CHANGED', name: dep, source: 'direct', previous: pVer, current: cVer });
  }

  const allResolved = new Set([...Object.keys(previous.resolvedDependencies || {}), ...Object.keys(current.resolvedDependencies || {})]);
  
  for (const dep of allResolved) {
    const pVer = previous.resolvedDependencies[dep];
    const cVer = current.resolvedDependencies[dep];
    
    if (pVer && !cVer) changes.push({ type: 'REMOVED', name: dep, source: 'transitive', previous: pVer });
    else if (!pVer && cVer) changes.push({ type: 'ADDED', name: dep, source: 'transitive', current: cVer });
    else if (pVer !== cVer) changes.push({ type: 'VERSION_CHANGED', name: dep, source: 'transitive', previous: pVer, current: cVer });
  }

  return changes;
}

class DependencyManager {
  constructor(cwd) {
    this.cwd = cwd;
    this.historyFile = path.join(cwd, '.agentdoctor', 'dependency_history.json');
    this.history = [];
    this.loadHistory();
  }

  loadHistory() {
    if (fs.existsSync(this.historyFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.historyFile, 'utf8'));
        this.history = Array.isArray(data) ? data : [];
      } catch (e) {
        this.history = [];
      }
    }
  }

  saveHistory() {
    try {
      const dir = path.dirname(this.historyFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2), 'utf8');
    } catch (e) {}
  }

  recordSnapshot() {
    const snapshot = buildDependencySnapshot(this.cwd);
    const git = getGitMetadata(this.cwd);
    snapshot.commitSha = git.commitSha;
    
    // Check if we already have this commit
    const existingIndex = this.history.findIndex(h => h.commitSha === git.commitSha);
    if (existingIndex >= 0) {
      this.history[existingIndex] = snapshot;
    } else {
      this.history.push(snapshot);
    }
    
    // Keep last 50
    if (this.history.length > 50) this.history = this.history.slice(-50);
    this.saveHistory();
    return snapshot;
  }
}

module.exports = {
  buildDependencySnapshot,
  compareDependencies,
  DependencyManager
};
