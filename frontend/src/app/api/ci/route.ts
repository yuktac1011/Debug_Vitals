import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const AGENTDOCTOR_DIR = path.join(PROJECT_ROOT, '.agentdoctor');

export async function GET() {
  try {
    const runsPath = path.join(AGENTDOCTOR_DIR, 'ci_runs.json');
    let runs = [];
    if (fs.existsSync(runsPath)) {
      runs = JSON.parse(fs.readFileSync(runsPath, 'utf-8'));
    }
    
    // Sort by startedAt desc
    runs.sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    return NextResponse.json(runs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
