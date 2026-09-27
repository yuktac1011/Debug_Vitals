import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const AGENTDOCTOR_DIR = path.join(PROJECT_ROOT, '.agentdoctor');

export async function GET() {
  try {
    const decPath = path.join(AGENTDOCTOR_DIR, 'decisions.json');
    let decisions = [];
    if (fs.existsSync(decPath)) {
      decisions = JSON.parse(fs.readFileSync(decPath, 'utf-8'));
    }
    
    // Sort by timestamp desc
    decisions.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(decisions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
