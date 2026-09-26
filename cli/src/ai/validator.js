function validateFindings(output) {
  if (!output || typeof output !== 'object') {
    return { valid: false, error: 'Output is not an object', findings: [] };
  }

  let rawFindings = output.findings;
  if (!Array.isArray(rawFindings)) {
    if (Array.isArray(output)) rawFindings = output;
    else return { valid: false, error: 'Missing findings array', findings: [] };
  }

  const validFindings = [];
  const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
  const validCategories = ['bug', 'security', 'reliability', 'performance', 'configuration', 'maintainability'];

  for (const f of rawFindings) {
    if (!f.title || typeof f.title !== 'string') continue;
    
    let severity = (f.severity || '').toLowerCase();
    if (!validSeverities.includes(severity)) severity = 'info';

    let category = (f.category || '').toLowerCase();
    if (!validCategories.includes(category)) category = 'maintainability';

    let confidence = typeof f.confidence === 'number' ? f.confidence : parseFloat(f.confidence);
    if (isNaN(confidence) || confidence < 0 || confidence > 1) confidence = 0.5;

    // Default filter threshold 0.60
    if (confidence < 0.60) continue;

    if (!f.description || typeof f.description !== 'string') continue;
    if (!f.evidence || typeof f.evidence !== 'string') continue;

    const file = typeof f.file === 'string' ? f.file : 'unknown';
    const line = typeof f.line === 'number' ? f.line : null;

    validFindings.push({
      title: f.title,
      severity,
      category,
      confidence,
      file,
      line,
      description: f.description,
      evidence: f.evidence,
      recommendation: typeof f.recommendation === 'string' ? f.recommendation : ''
    });
  }

  return {
    valid: true,
    findings: validFindings,
    summary: typeof output.summary === 'string' ? output.summary : ''
  };
}

module.exports = { validateFindings };
