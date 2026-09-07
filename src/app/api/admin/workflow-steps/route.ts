export const runtime = 'nodejs';
// src/app/api/admin/workflow-steps/route.ts
// Configurable Workflow Framework. Two engine types seeded: CSR_PLANTATION
// (mirrors the existing PlantationSite.currentPhase enum exactly, via
// mapsToPhase) and CORPORATE_ESG (a genuinely different step sequence,
// proving the framework supports more than one engine type without any
// new engineering — this is the framework, not the ESG engine's actual
// feature build, which stays unbuilt until a real tenant needs it).
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
}

const SEED_STEPS: Record<string, { stepKey: string; stepLabel: string; order: number; mapsToPhase?: string }[]> = {
  CSR_PLANTATION: [
    { stepKey: 'PLANNING',         stepLabel: 'Planning',            order: 1, mapsToPhase: 'PLANNING' },
    { stepKey: 'LAND_PREPARATION', stepLabel: 'Land Preparation',    order: 2, mapsToPhase: 'LAND_PREPARATION' },
    { stepKey: 'PIT_DIGGING',      stepLabel: 'Pit Digging',         order: 3, mapsToPhase: 'PIT_DIGGING' },
    { stepKey: 'PLANTATION',       stepLabel: 'Plantation',          order: 4, mapsToPhase: 'PLANTATION' },
    { stepKey: 'GAP_FILLING',      stepLabel: 'Gap Filling',         order: 5, mapsToPhase: 'GAP_FILLING' },
    { stepKey: 'MONITORING',       stepLabel: 'Monitoring',          order: 6, mapsToPhase: 'MONITORING' },
    { stepKey: 'COMPLETED',        stepLabel: 'Completed',           order: 7, mapsToPhase: 'COMPLETED' },
  ],
  // A deliberately different shape from the tree-planting lifecycle above —
  // this is what "the architecture is generic enough to expand" actually
  // looks like: a second engine type with its own real step sequence,
  // with no mapping to currentPhase at all (that enum is specific to
  // tree plantation execution, not general environmental interventions).
  CORPORATE_ESG: [
    { stepKey: 'PROJECT_SCOPING',      stepLabel: 'Project Scoping',        order: 1 },
    { stepKey: 'BASELINE_ASSESSMENT',  stepLabel: 'Baseline Assessment',    order: 2 },
    { stepKey: 'IMPLEMENTATION',       stepLabel: 'Implementation',         order: 3 },
    { stepKey: 'IMPACT_MEASUREMENT',   stepLabel: 'Impact Measurement',     order: 4 },
    { stepKey: 'VERIFICATION',         stepLabel: 'Verification',           order: 5 },
    { stepKey: 'REPORTING',            stepLabel: 'Reporting',              order: 6 },
  ],
};

async function ensureSeeded(engineType: string) {
  const steps = SEED_STEPS[engineType];
  if (!steps) return;
  for (const s of steps) {
    await (prisma as any).workflowStepTemplate.upsert({
      where: { engineType_stepKey: { engineType, stepKey: s.stepKey } },
      update: { stepLabel: s.stepLabel, order: s.order, mapsToPhase: s.mapsToPhase || null },
      create: { engineType, stepKey: s.stepKey, stepLabel: s.stepLabel, order: s.order, mapsToPhase: s.mapsToPhase || null },
    });
  }
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const engineType = new URL(req.url).searchParams.get('engineType') || 'CSR_PLANTATION';

    await ensureSeeded(engineType);

    const steps = await (prisma as any).workflowStepTemplate.findMany({
      where: { engineType },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ engineType, steps });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
