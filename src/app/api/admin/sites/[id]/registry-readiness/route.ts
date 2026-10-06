export const runtime = 'nodejs';
// src/app/api/admin/sites/[id]/registry-readiness/route.ts
// The real version of what /admin/dmrv/readiness faked. A registry-
// readiness CONFIGURABLE MODULE, not a hardcoded registry-submission
// workflow — per the explicit answer this was scoped against: build the
// data model and a lightweight readiness view now; the actual authoring
// workflow (multi-step PDD editor, formal submission tracking) stays
// gated until a real tenant has a committed registry date.
//
// Gated behind the same PDD/BASELINE_ASSESSMENT module toggles from
// Phase 0B — an org that hasn't enabled these (the default for every
// org, since registry pursuit is opt-in, not assumed) gets a clear
// message pointing at Super Admin's Engine Configuration, not a wall of
// fields it never asked for.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';
import { moduleEnabled } from '@/lib/module-gating';

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

    const site = await prisma.plantationSite.findFirst({ where: { id: params.id, orgId } });
    if (!site) return NextResponse.json({ error: 'Site not found in this organisation' }, { status: 404 });

    const [pddEnabled, baselineEnabled] = await Promise.all([
      moduleEnabled(orgId, 'PDD'),
      moduleEnabled(orgId, 'BASELINE_ASSESSMENT'),
    ]);

    if (!pddEnabled && !baselineEnabled) {
      return NextResponse.json({ enabled: false });
    }

    const [pdd, baseline, carbonConfig, polygonCount, monitoringCount] = await Promise.all([
      (prisma as any).projectDesignDocument.findFirst({ where: { siteId: params.id, orgId }, orderBy: { version: 'desc' } }),
      (prisma as any).baselineAssessment.findFirst({ where: { siteId: params.id, orgId }, orderBy: { assessedAt: 'desc' } }),
      (prisma as any).tenantCarbonConfig.findUnique({ where: { orgId } }),
      prisma.landAssignment.count({ where: { siteId: params.id, land: { polygonGeoJson: { not: null as any } } } }),
      prisma.monitoringVisit.count({ where: { siteId: params.id } }),
    ]);

    // Real checks against real data — no fabricated score. Each check is
    // either genuinely true or genuinely false; there's no "estimated"
    // category the way the old mockup had.
    const checks = [
      { key: 'pdd', label: 'Project Design Document drafted', done: !!pdd, detail: pdd ? `Status: ${pdd.status}` : 'Not started' },
      { key: 'baseline', label: 'Baseline assessment captured', done: !!baseline, detail: baseline ? `Recorded ${new Date(baseline.assessedAt).toLocaleDateString('en-IN')}` : 'Not started' },
      { key: 'methodology', label: 'Carbon methodology assigned', done: !!carbonConfig?.defaultMethodologyId, detail: carbonConfig?.defaultMethodologyId ? 'Assigned' : 'Using default estimate only' },
      { key: 'boundary', label: 'At least one parcel boundary mapped', done: polygonCount > 0, detail: `${polygonCount} parcel(s) with a parsed boundary` },
      { key: 'monitoring', label: 'At least one monitoring visit recorded', done: monitoringCount > 0, detail: `${monitoringCount} visit(s) on file` },
    ];
    const score = Math.round((checks.filter(c => c.done).length / checks.length) * 100);

    return NextResponse.json({ enabled: true, pddEnabled, baselineEnabled, score, checks, pdd, baseline });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const body = await req.json();
    const kind = body.kind; // 'pdd' | 'baseline'

    const site = await prisma.plantationSite.findFirst({ where: { id: params.id, orgId } });
    if (!site) return NextResponse.json({ error: 'Site not found in this organisation' }, { status: 404 });

    if (kind === 'pdd') {
      if (!(await moduleEnabled(orgId, 'PDD')))
        return NextResponse.json({ error: 'The PDD module is not enabled for your organisation — ask a Super Admin to enable it in Engine Configuration.' }, { status: 403 });

      const pdd = await (prisma as any).projectDesignDocument.create({
        data: {
          siteId: params.id, orgId,
          registryType: body.registryType || null,
          status: 'DRAFT',
          baselineScenario: body.baselineScenario || null,
          additionalityJustification: body.additionalityJustification || null,
          permanencePlan: body.permanencePlan || null,
        },
      });
      return NextResponse.json({ success: true, pdd });
    }

    if (kind === 'baseline') {
      if (!(await moduleEnabled(orgId, 'BASELINE_ASSESSMENT')))
        return NextResponse.json({ error: 'The Baseline Assessment module is not enabled for your organisation — ask a Super Admin to enable it in Engine Configuration.' }, { status: 403 });

      const baseline = await (prisma as any).baselineAssessment.create({
        data: {
          siteId: params.id, orgId,
          preExistingVegetation: body.preExistingVegetation || null,
          landUseHistory: body.landUseHistory || null,
          soilCondition: body.soilCondition || null,
        },
      });
      return NextResponse.json({ success: true, baseline });
    }

    return NextResponse.json({ error: 'Unknown kind — must be "pdd" or "baseline"' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
