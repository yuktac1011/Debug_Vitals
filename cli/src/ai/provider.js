class AIProvider {
  async analyze(request) {
    throw new Error('Not implemented');
  }
}

class MockAIProvider extends AIProvider {
  async analyze(request) {
    const inputTokens = Math.ceil(JSON.stringify(request).length / 4);
    
    // Check for simulated errors
    if (process.env.AGENTDOCTOR_MOCK_ERROR === '429') {
      const error = new Error('Rate limit exceeded');
      error.status = 429;
      throw error;
    }
    if (process.env.AGENTDOCTOR_MOCK_ERROR === 'timeout') {
      const error = new Error('Gateway Timeout');
      error.code = 'ETIMEDOUT';
      throw error;
    }
    
    // Simulate API delay
    await new Promise(r => setTimeout(r, 1000));
    
    const response = {
      findings: [],
      summary: "No issues found in the supplied context."
    };

    // Simulated finding for auth.ts
    if (request.files && request.files.some(f => f.path.includes('auth.ts') && f.content.includes('req.body.user'))) {
      response.findings.push({
        title: "SQL injection risk",
        severity: "high",
        category: "security",
        confidence: 0.92,
        file: "src/auth.ts",
        line: 42,
        description: "User-controlled input reaches a SQL query.",
        evidence: "String concatenation used with req.body.user",
        recommendation: "Use parameterized queries."
      });
      response.summary = "Found 1 security issue.";
    }

    // Existing test finding for package.json
    if (request.files && request.files.some(f => f.path.includes('package.json') && f.content.includes('{}'))) {
      response.findings.push({
        title: "Missing author in package.json",
        severity: "low",
        category: "configuration",
        confidence: 0.95,
        file: "package.json",
        line: null,
        description: "The package.json file should have an author field.",
        evidence: "The provided package.json does not contain an 'author' field.",
        recommendation: "Add an 'author' field."
      });
      response.summary = (response.summary === "No issues found in the supplied context.") ? "Found 1 configuration issue." : response.summary + " Found 1 configuration issue.";
    }

    const outputTokens = Math.ceil(JSON.stringify(response).length / 4);

    return {
      raw: response,
      inputTokens,
      outputTokens
    };
  }
}

module.exports = { AIProvider, MockAIProvider };
