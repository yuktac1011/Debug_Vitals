class AIProvider {
  async analyze(request) {
    throw new Error('Not implemented');
  }
}

class MockAIProvider extends AIProvider {
  async analyze(request) {
    // estimate tokens
    const inputTokens = Math.ceil(JSON.stringify(request).length / 4);
    
    // Simulate API delay
    await new Promise(r => setTimeout(r, 1000));
    
    const response = {
      findings: [],
      summary: "No issues found in the supplied context."
    };

    // If there's a package.json, simulate a finding for testing
    if (request.files && request.files.some(f => f.path.includes('package.json'))) {
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
      response.summary = "Found 1 configuration issue.";
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
