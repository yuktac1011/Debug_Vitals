import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const AGENTDOCTOR_DIR = path.join(PROJECT_ROOT, '.agentdoctor');

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const runsPath = path.join(AGENTDOCTOR_DIR, 'ci_runs.json');
    let runs = [];
    if (fs.existsSync(runsPath)) {
      runs = JSON.parse(fs.readFileSync(runsPath, 'utf-8'));
    }
    
    const { id } = await params;
    const run = runs.find((r: any) => r.id === id);

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
