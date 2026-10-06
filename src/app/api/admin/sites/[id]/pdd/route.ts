export const runtime = 'nodejs';
// src/app/api/admin/sites/[id]/pdd/route.ts
// The real PDD editor's list/version endpoint — closes the gap left
// deliberately open in Registry Readiness's lightweight 2-field draft
// creation. GET returns every version for this site (a registry will
// ask for PDD history throughout a project's life, not just the latest).
// POST creates a new version, copying the previous one's content
// forward as a starting point for revision.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';
import { moduleEnabled } from '@/lib/module-gating';
import { appendStatusHistory } from '@/lib/registry-workflow';

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

    if (!(await moduleEnabled(orgId, 'PDD')))
      return NextResponse.json({ enabled: false });

    const versions = await prisma.projectDesignDocument.findMany({
      where: { siteId: params.id, orgId },
      orderBy: { version: 'desc' },
    });

    return NextResponse.json({ enabled: true, versions, current: versions[0] || null });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireAdmin();
    const orgId = await getActiveOrgId();
    const body = await req.json();

    if (!(await moduleEnabled(orgId, 'PDD')))
      return NextResponse.json({ error: 'The PDD module is not enabled for your organisation.' }, { status: 403 });

    const site = await prisma.plantationSite.findFirst({ where: { id: params.id, orgId } });
    if (!site) return NextResponse.json({ error: 'Site not found in this organisation' }, { status: 404 });

    if (body.kind === 'new_version') {
      // Bump from whichever version this new one is explicitly based on —
      // required, since silently picking "the latest" could create a new
      // version from a stale copy if two people are editing at once.
      const basedOn = await prisma.projectDesignDocument.findFirst({ where: { id: body.basedOnId, siteId: params.id, orgId } });
      if (!basedOn) return NextResponse.json({ error: 'Base version not found' }, { status: 404 });

      const newVersion = await prisma.projectDesignDocument.create({
        data: {
          siteId: params.id, orgId, version: basedOn.version + 1,
          previousVersionId: basedOn.id,
          registryType: basedOn.registryType, status: 'DRAFT',
          baselineScenario: basedOn.baselineScenario,
          additionalityJustification: basedOn.additionalityJustification,
          permanencePlan: basedOn.permanencePlan,
          projectDescription: basedOn.projectDescription,
          leakageAssessment: basedOn.leakageAssessment,
          stakeholderConsultation: basedOn.stakeholderConsultation,
          monitoringMethodology: basedOn.monitoringMethodology,
          creditingPeriodStart: basedOn.creditingPeriodStart,
          creditingPeriodEnd: basedOn.creditingPeriodEnd,
          createdById: actor.id,
          statusHistory: appendStatusHistory([], { status: 'DRAFT', changedAt: new Date().toISOString(), changedBy: actor.name || actor.email, note: `New version created from v${basedOn.version}` }) as any,
        },
      });
      return NextResponse.json({ success: true, pdd: newVersion });
    }

    // First PDD ever for this site — same fields Registry Readiness's
    // lightweight creation used, kept working identically for callers
    // that only need that.
    const pdd = await prisma.projectDesignDocument.create({
      data: {
        siteId: params.id, orgId, version: 1, status: 'DRAFT',
        registryType: body.registryType || null,
        baselineScenario: body.baselineScenario || null,
        createdById: actor.id,
        statusHistory: appendStatusHistory([], { status: 'DRAFT', changedAt: new Date().toISOString(), changedBy: actor.name || actor.email }) as any,
      },
    });
    return NextResponse.json({ success: true, pdd });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
