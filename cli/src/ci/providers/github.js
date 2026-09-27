class GitHubActionsProvider {
  parse(payload) {
    if (!payload || !payload.workflow_run) {
      throw new Error('Invalid GitHub Actions payload');
    }

    const run = payload.workflow_run;
    const rawJobs = payload.jobs || [];

    const normalizedJobs = rawJobs.map(job => {
      const steps = (job.steps || []).map(step => {
        const normalizedStep = {
          name: step.name,
          status: step.status,
          conclusion: step.conclusion
        };
        
        if (step.conclusion === 'failure') {
          normalizedStep.failure = {
            jobId: job.id,
            stepName: step.name,
            message: step.failure_message || 'Step failed',
            logExcerpt: step.log || '',
            exitCode: step.exit_code || 1,
            timestamp: step.completed_at
          };
        }
        return normalizedStep;
      });

      return {
        id: job.id,
        name: job.name,
        status: job.status,
        conclusion: job.conclusion,
        runnerOS: job.runner_os || 'unknown',
        runtimeInfo: {}, // GitHub Actions doesn't provide this natively in payload without parsing logs
        steps
      };
    });

    return {
      id: `gh-${run.id}`,
      provider: 'github-actions',
      repository: run.repository ? run.repository.full_name : 'unknown',
      branch: run.head_branch || 'unknown',
      commitSha: run.head_sha || 'unknown',
      workflow: run.name || 'unknown',
      status: run.status,
      conclusion: run.conclusion,
      startedAt: run.run_started_at || run.created_at,
      completedAt: run.updated_at,
      jobs: normalizedJobs
    };
  }
}

module.exports = { GitHubActionsProvider };
