import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const AGENTDOCTOR_DIR = path.join(PROJECT_ROOT, '.agentdoctor');

export async function GET() {
  try {
    const activityPath = path.join(AGENTDOCTOR_DIR, 'activity.json');
    let activity = [];
    if (fs.existsSync(activityPath)) {
      activity = JSON.parse(fs.readFileSync(activityPath, 'utf-8'));
    }
    
    // Sort by timestamp desc
    activity.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(activity);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
