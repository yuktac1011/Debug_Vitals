const fs = require('fs');
const path = require('path');
const { compareEnvironmentSnapshots } = require('./snapshot');
const { compareDependencies } = require('./dependencies');

class CorrelationEngine {
  constructor(cwd) {
    this.cwd = cwd;
  }

  analyze(input) {
    const {
      ciRun,
      localEnvironment,
      ciEnvironment,
      localDependencies,
      ciDependencies,
      agentActivities = []
    } = input;

    const candidates = [];
    const evidence = [];
    const missingEvidence = [];
    const timeline = [];

    if (!ciRun || ciRun.conclusion !== 'failure') {
      return { status: 'NO_MISMATCH_FOUND', candidates: [], evidence: [], timeline: [], missingEvidence: [] };
    }

    const failedJob = ciRun.jobs?.find(j => j.conclusion === 'failure') || ciRun.jobs?.[0];
    const failedStep = failedJob?.steps?.find(s => s.failure);

    if (failedStep) {
      evidence.push(`Failure occurred in step: ${failedStep.name}`);
      timeline.push({ 
        type: 'CI_FAILURE', 
        timestamp: failedStep.failure?.timestamp || ciRun.completedAt, 
        message: `CI Failed: ${failedStep.name}`,
        details: failedStep.failure?.message
      });
    }

    // Agent Activities mapping
    if (agentActivities.length > 0) {
      for (const act of agentActivities) {
        // filter activities roughly around the CI run time or just put them in timeline
        timeline.push({
          type: 'AGENT_ACTION',
          timestamp: act.timestamp,
          message: `Agent action: ${act.action}`,
          details: act.resource
        });
      }
    }

    // Compare environments
    if (localEnvironment && ciEnvironment) {
      const envDiffs = compareEnvironmentSnapshots(localEnvironment, ciEnvironment);
      
      let hasRuntimeMismatch = false;
      let hasPkgManagerMismatch = false;

      for (const diff of envDiffs) {
        if (diff.includes('Runtime mismatch')) {
          hasRuntimeMismatch = true;
          evidence.push(diff);
        } else if (diff.includes('Package manager mismatch')) {
          hasPkgManagerMismatch = true;
          evidence.push(diff);
        } else if (diff.includes('Environment variable missing')) {
          evidence.push(diff);
          candidates.push({
            type: 'MISSING_ENVIRONMENT_VARIABLE',
            title: 'Missing Environment Variable in CI',
            confidence: 0.85,
            evidence: [diff, 'Local environment requires this variable.'],
            recommendation: 'Ensure the environment variable is injected into the CI context.'
          });
        }
      }

      if (hasRuntimeMismatch) {
        candidates.push({
          type: 'RUNTIME_MISMATCH',
          title: 'Runtime version mismatch',
          confidence: 0.82,
          evidence: ['Runtime differs between environments', 'Failure occurred during execution'],
          recommendation: 'Align the CI runtime version to match local, or vice versa.'
        });
        timeline.push({
          type: 'ENVIRONMENT_MISMATCH',
          timestamp: ciRun.startedAt,
          message: 'Environment Mismatch Detected',
          details: 'Runtime version mismatch between local and CI'
        });
      }
      
      if (hasPkgManagerMismatch) {
        candidates.push({
          type: 'PACKAGE_MANAGER_MISMATCH',
          title: 'Package manager mismatch',
          confidence: 0.75,
          evidence: ['Different package manager used in CI'],
          recommendation: 'Use the same package manager locally and in CI.'
        });
      }
    } else {
      missingEvidence.push('Local or CI environment snapshot is missing.');
    }

    // Compare dependencies
    if (localDependencies && ciDependencies) {
      const depDiffs = compareDependencies(localDependencies, ciDependencies);
      
      let lockfileChanged = false;
      let depsChanged = 0;

      for (const diff of depDiffs) {
        if (diff.type === 'LOCKFILE_CHANGED') lockfileChanged = true;
        if (['VERSION_CHANGED', 'ADDED', 'REMOVED'].includes(diff.type)) depsChanged++;
      }

      if (lockfileChanged || depsChanged > 0) {
        evidence.push(`${depsChanged} dependency differences detected.`);
        candidates.push({
          type: 'DEPENDENCY_STATE_MISMATCH',
          title: 'Dependency state differs',
          confidence: 0.78,
          evidence: [lockfileChanged ? 'Lockfile hashes differ' : 'Lockfiles match but unresolved versions differ', `${depsChanged} changes detected`],
          recommendation: 'Ensure lockfile is committed and CI installs exactly what is locked.'
        });
        timeline.push({
          type: 'DEPENDENCY_MISMATCH',
          timestamp: localDependencies.timestamp,
          message: 'Dependency State Changed',
          details: `${depsChanged} differences detected`
        });
      }

      if (localDependencies.lockfileMissing && ciDependencies.lockfileMissing) {
        candidates.push({
          type: 'POSSIBLE_LOCKFILE_DRIFT',
          title: 'Lockfile missing',
          confidence: 0.65,
          evidence: ['No lockfile was detected.'],
          recommendation: 'Commit a lockfile to ensure reproducible builds.'
        });
      }
    } else {
      missingEvidence.push('Local or CI dependency snapshot is missing.');
    }

    // Status logic
    let status = 'NO_MISMATCH_FOUND';
    if (candidates.length === 1) status = 'CLEAR_SIGNAL';
    else if (candidates.length > 1) status = 'MULTIPLE_SIGNALS';
    else if (missingEvidence.length > 0) status = 'INSUFFICIENT_EVIDENCE';

    // Sort timeline chronologically
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      status,
      candidates,
      evidence,
      timeline,
      missingEvidence
    };
  }
}

module.exports = { CorrelationEngine };
