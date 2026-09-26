import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const AGENTDOCTOR_DIR = path.join(PROJECT_ROOT, '.agentdoctor');

export async function POST(req: Request) {
  try {
    const { id, action } = await req.json();
    const findingsPath = path.join(AGENTDOCTOR_DIR, 'findings.json');

    if (!fs.existsSync(findingsPath)) {
      return NextResponse.json({ error: 'No findings found' }, { status: 404 });
    }

    const findings = JSON.parse(fs.readFileSync(findingsPath, 'utf-8'));
    const finding = findings.find((f: any) => f.id === id);

    if (!finding) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
    }

    if (action === 'resolve') finding.status = 'resolved';
    else if (action === 'ignore') finding.status = 'ignored';
    else if (action === 'reopen') finding.status = 'open';
    else return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    fs.writeFileSync(findingsPath, JSON.stringify(findings, null, 2), 'utf-8');

    return NextResponse.json({ success: true, finding });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
