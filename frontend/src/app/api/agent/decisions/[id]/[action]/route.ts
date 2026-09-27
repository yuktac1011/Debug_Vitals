import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const AGENTDOCTOR_DIR = path.join(PROJECT_ROOT, '.agentdoctor');

export async function POST(req: Request, { params }: { params: Promise<{ id: string, action: string }> }) {
  try {
    const { id, action } = await params;
    
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const decPath = path.join(AGENTDOCTOR_DIR, 'decisions.json');
    let decisions = [];
    if (fs.existsSync(decPath)) {
      decisions = JSON.parse(fs.readFileSync(decPath, 'utf-8'));
    }

    const decIndex = decisions.findIndex((d: any) => d.id === id);
    if (decIndex === -1) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
    }

    if (decisions[decIndex].status !== 'PENDING') {
      return NextResponse.json({ error: 'Decision is already resolved' }, { status: 400 });
    }

    decisions[decIndex].status = action === 'approve' ? 'APPROVED' : 'REJECTED';
    fs.writeFileSync(decPath, JSON.stringify(decisions, null, 2), 'utf-8');

    return NextResponse.json({ success: true, decision: decisions[decIndex] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
