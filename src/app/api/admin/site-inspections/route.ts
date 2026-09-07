export const runtime = 'nodejs';
// src/app/api/admin/site-inspections/route.ts
// dMRV Roadmap Phase 4. Read-only, deliberately — a completed SiteInspection
// is captured by an authenticated FieldOfficer and isn't donor-facing at
// all, unlike MonitoringVisit which needed a publish gate before reaching
// donors. There's nothing for admin to "approve" here that isn't already
// true the moment an officer submits it; what was actually missing was
// visibility — admin had no way to see these at all, confirmed by search.
// The one thing surfaced beyond a plain list: which checklist items came
// back false, since an incomplete checklist on a completed inspection is
// exactly the kind of thing that's easy to miss without a dedicated view.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const params = new URL(req.url).searchParams;
    const status = params.get('status') || 'COMPLETED';

    const inspections = await prisma.siteInspection.findMany({
      where: { farmer: { orgId }, ...(status !== 'ALL' ? { status: status as any } : {}) },
      include: {
        farmer: { select: { fullName: true, mobile: true, village: true } },
        land: { select: { surveyGutNumber: true } },
        officer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const shaped = inspections.map(i => {
      const incompleteChecks = [
        !i.ownershipVerified && 'Ownership not verified',
        !i.boundaryVerified && 'Boundary not verified',
        !i.farmerMetPersonally && 'Farmer not met personally',
        !i.plantationFeasible && 'Plantation not marked feasible',
        !i.waterSourceAvailable && 'No water source available',
      ].filter(Boolean) as string[];
      return { ...i, incompleteChecks };
    });

    return NextResponse.json({ inspections: shaped });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
