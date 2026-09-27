import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { CorrelationEngine } from '../../../../../../cli/src/correlation';
import { buildEnvironmentSnapshot } from '../../../../../../cli/src/snapshot';
import { DependencyManager } from '../../../../../../cli/src/dependencies';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const AGENTDOCTOR_DIR = path.join(PROJECT_ROOT, '.agentdoctor');

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // 1. Get CI Run
    const runsPath = path.join(AGENTDOCTOR_DIR, 'ci_runs.json');
    let runs = [];
    if (fs.existsSync(runsPath)) {
      runs = JSON.parse(fs.readFileSync(runsPath, 'utf-8'));
    }
    const ciRun = runs.find((r: any) => r.id === id);

    if (!ciRun) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    // 2. Get local environment
    const localEnvironment = buildEnvironmentSnapshot(PROJECT_ROOT);

    // 3. Get local dependencies
    const depManager = new DependencyManager(PROJECT_ROOT);
    const localDependencies = depManager.history.length > 0 ? depManager.history[depManager.history.length - 1] : null;

    // Simulate CI environment and dependencies since we don't have a full CI agent yet
    // For demo purposes, we can create slight mutations or use local
    const ciEnvironment = { ...localEnvironment, runtimeVersions: { ...localEnvironment.runtimeVersions, node: 'v20.0.0' } };
    const ciDependencies = localDependencies ? { ...localDependencies, lockfileHash: 'different-hash' } : null;

    // 4. Get Agent Activities
    const activityPath = path.join(AGENTDOCTOR_DIR, 'activity.json');
    let agentActivities = [];
    if (fs.existsSync(activityPath)) {
      agentActivities = JSON.parse(fs.readFileSync(activityPath, 'utf-8'));
    }

    const input = {
      ciRun,
      localEnvironment,
      ciEnvironment,
      localDependencies,
      ciDependencies,
      agentActivities
    };

    const engine = new CorrelationEngine(PROJECT_ROOT);
    const analysis = engine.analyze(input);

    return NextResponse.json(analysis);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
