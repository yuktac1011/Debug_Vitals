import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Since frontend is in /frontend, project root is one level up
const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const AGENTDOCTOR_DIR = path.join(PROJECT_ROOT, '.agentdoctor');

export async function GET() {
  try {
    const configPath = path.join(AGENTDOCTOR_DIR, 'config.json');
    const findingsPath = path.join(AGENTDOCTOR_DIR, 'findings.json');

    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }

    let findings = [];
    if (fs.existsSync(findingsPath)) {
      findings = JSON.parse(fs.readFileSync(findingsPath, 'utf-8'));
    }

    // Calculate risk summary
    const riskSummary = {
      total: findings.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      open: 0,
      resolved: 0,
      ignored: 0
    };

    for (const f of findings) {
      if (f.status === 'new' || f.status === 'open') {
        riskSummary.open++;
        riskSummary[f.severity] = (riskSummary[f.severity] || 0) + 1;
      } else if (f.status === 'resolved') {
        riskSummary.resolved++;
      } else if (f.status === 'ignored') {
        riskSummary.ignored++;
      }
    }

    return NextResponse.json({
      environment: config.environment || {},
      sessionId: config.sessionId,
      findings,
      riskSummary
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
