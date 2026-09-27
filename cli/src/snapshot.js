const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getEnvironmentSnapshot } = require('./environment');

function safeExecWithTimeout(cmd, timeoutMs = 2000) {
  try {
    const output = execSync(cmd, { stdio: 'pipe', timeout: timeoutMs }).toString().trim();
    return { available: true, version: output || 'unknown' };
  } catch (err) {
    if (err.code === 'ETIMEDOUT') return { available: false, reason: 'timeout' };
    return { available: false, reason: 'not installed or command failed' };
  }
}

function getGitMetadata(cwd) {
  const git = { branch: 'unknown', commitSha: 'unknown', dirty: false };
  try {
    git.branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd, stdio: 'pipe' }).toString().trim();
    git.commitSha = execSync('git rev-parse HEAD', { cwd, stdio: 'pipe' }).toString().trim();
    const status = execSync('git status --porcelain', { cwd, stdio: 'pipe' }).toString().trim();
    git.dirty = status.length > 0;
  } catch (err) {}
  return git;
}

function processEnvironmentVariables() {
  const envData = {};
  const sensitiveKeys = ['SECRET', 'KEY', 'TOKEN', 'PASSWORD', 'CREDENTIAL', 'AUTH'];
  
  for (const key of Object.keys(process.env)) {
    const isSensitive = sensitiveKeys.some(sk => key.toUpperCase().includes(sk));
    envData[key] = isSensitive ? 'sensitive' : 'present';
  }
  return envData;
}

function buildEnvironmentSnapshot(cwd = process.cwd()) {
  const base = getEnvironmentSnapshot(cwd);
  
  const runtimes = {};
  for (const [rt, val] of Object.entries(base.runtime || {})) {
    if (val) runtimes[rt] = val; // Only include detected runtimes
  }
  
  // Add more tools
  const tools = {
    docker: safeExecWithTimeout('docker --version'),
    make: safeExecWithTimeout('make --version')
  };

  const git = getGitMetadata(cwd);
  const environmentVariables = processEnvironmentVariables();

  return {
    timestamp: new Date().toISOString(),
    os: base.os?.platform || 'unknown',
    architecture: base.os?.architecture || 'unknown',
    hostname: base.os?.hostname || 'unknown',
    runtimeVersions: runtimes,
    packageManager: base.packageManager,
    packageManagerVersion: runtimes[base.packageManager] || 'unknown',
    frameworks: [], // Can be populated from dependencies later
    projectType: base.projectType,
    git,
    environmentVariables,
    tools
  };
}

function compareEnvironmentSnapshots(local, ci) {
  const differences = [];

  if (local.os !== ci.os) differences.push(`OS mismatch (Local: ${local.os}, CI: ${ci.os})`);
  if (local.architecture !== ci.architecture) differences.push(`Architecture mismatch (Local: ${local.architecture}, CI: ${ci.architecture})`);
  if (local.packageManager !== ci.packageManager) differences.push(`Package manager mismatch (Local: ${local.packageManager}, CI: ${ci.packageManager})`);
  
  if (local.packageManagerVersion !== ci.packageManagerVersion) {
    differences.push(`${local.packageManager} version mismatch (Local: ${local.packageManagerVersion}, CI: ${ci.packageManagerVersion})`);
  }

  // Compare runtime versions
  const allRuntimes = new Set([...Object.keys(local.runtimeVersions || {}), ...Object.keys(ci.runtimeVersions || {})]);
  for (const rt of allRuntimes) {
    const lVer = local.runtimeVersions[rt];
    const cVer = ci.runtimeVersions[rt];
    if (lVer && !cVer) differences.push(`Runtime mismatch: ${rt} (Local: ${lVer}, CI: missing)`);
    else if (!lVer && cVer) differences.push(`Runtime mismatch: ${rt} (Local: missing, CI: ${cVer})`);
    else if (lVer !== cVer) differences.push(`Runtime mismatch: ${rt} (Local: ${lVer}, CI: ${cVer})`);
  }

  // Compare tools
  const allTools = new Set([...Object.keys(local.tools || {}), ...Object.keys(ci.tools || {})]);
  for (const t of allTools) {
    const lTool = local.tools[t];
    const cTool = ci.tools[t];
    if (lTool?.available && cTool?.available && lTool.version !== cTool.version) {
      differences.push(`Tool version mismatch: ${t} (Local: ${lTool.version}, CI: ${cTool.version})`);
    }
  }

  // Compare environment variables
  const allEnvVars = new Set([...Object.keys(local.environmentVariables || {}), ...Object.keys(ci.environmentVariables || {})]);
  for (const ev of allEnvVars) {
    const lVal = local.environmentVariables[ev];
    const cVal = ci.environmentVariables[ev];
    if (lVal && !cVal) differences.push(`Environment variable missing in CI: ${ev}`);
    // We usually care if CI is missing something local has. Sometimes vice-versa, but mostly local has it and CI doesn't.
  }

  return differences;
}

module.exports = {
  buildEnvironmentSnapshot,
  compareEnvironmentSnapshots,
  getGitMetadata,
  processEnvironmentVariables,
  safeExecWithTimeout
};
