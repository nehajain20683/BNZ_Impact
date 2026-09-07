export const runtime = 'nodejs';
// src/app/api/admin/sites/[id]/sampling-plan/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';
import { generateSamplingPlan } from '@/lib/sampling';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();

    const plans = await prisma.samplingPlan.findMany({
      where: { siteId: params.id, orgId },
      include: { plots: true },
      orderBy: { generatedAt: 'desc' },
    });

    return NextResponse.json({ plans });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireAdmin();
    const orgId = await getActiveOrgId();
    const body = await req.json();
    const method = ['RANDOM', 'STRATIFIED', 'PLOT_BASED'].includes(body.method) ? body.method : 'RANDOM';
    const targetPct = Math.min(100, Math.max(1, Number(body.targetPct) || 10));

    const site = await prisma.plantationSite.findFirst({ where: { id: params.id, orgId } });
    if (!site) return NextResponse.json({ error: 'Site not found in this organisation' }, { status: 404 });

    const trees = await prisma.tree.findMany({
      where: { siteId: params.id, orgId, status: { not: 'PENDING' } },
      select: { id: true, species: true, assignmentId: true },
    });
    if (trees.length === 0)
      return NextResponse.json({ error: 'No planted trees on this site yet — nothing to sample.' }, { status: 400 });

    const result = generateSamplingPlan(method, trees, targetPct);

    const plan = await prisma.samplingPlan.create({
      data: {
        siteId: params.id, orgId, method, targetPct,
        totalPopulation: result.totalPopulation, sampleSize: result.sampleSize,
        createdById: actor.id,
        plots: {
          create: result.plots.map(p => ({
            plotCode: p.plotCode, assignmentId: p.assignmentId || null, stratum: p.stratum || null, treeCount: p.treeCount,
          })),
        },
        sampleTrees: {
          create: result.trees.map(t => ({ treeId: t.treeId, plotCode: t.plotCode || null, stratum: t.stratum || null })),
        },
      },
      include: { plots: true },
    });

    return NextResponse.json({ success: true, plan });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
