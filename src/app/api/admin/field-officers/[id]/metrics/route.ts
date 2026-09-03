export const runtime = 'nodejs';
// src/app/api/admin/field-officers/[id]/metrics/route.ts
// Supervisor productivity metrics per officer. Deliberately only reports
// what this app actually tracks — Issues Reported and Hours Active from
// the original spec have no real data source yet (no issue-reporting
// module, no attendance/session system), so those are reported as
// "not tracked yet" rather than shown as a fabricated 0, which would look
// identical to "reported zero issues" and mislead a supervisor reading it.
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

function periodStart(period: string): Date | undefined {
  const now = new Date();
  if (period === 'today') { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
  if (period === 'week')  { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
  if (period === 'month') { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
  return undefined; // 'all'
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const period = new URL(req.url).searchParams.get('period') || 'week';
    const since = periodStart(period);

    const officer = await prisma.fieldOfficer.findFirst({ where: { id: params.id, orgId } });
    if (!officer) return NextResponse.json({ error: 'Field officer not found in this organisation' }, { status: 404 });

    const dateFilter = since ? { gte: since } : undefined;

    const [treeImages, inspections, monitoringVisits, issueReports, assignedFarmerCount] = await Promise.all([
      prisma.treeImage.findMany({
        where: { capturedById: officer.id, ...(dateFilter ? { capturedAt: dateFilter } : {}) },
        select: { id: true, capturedAt: true, treeTag: true },
        orderBy: { capturedAt: 'desc' },
      }),
      prisma.siteInspection.findMany({
        where: { officerId: officer.id, ...(dateFilter ? { createdAt: dateFilter } : {}) },
        select: { id: true, farmerId: true, inspectedAt: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.monitoringVisit.findMany({
        where: { officerId: officer.id, ...(dateFilter ? { visitDate: dateFilter } : {}) },
        select: { id: true, farmerId: true, visitDate: true, survivalPct: true, _count: { select: { treeSamples: true } } },
        orderBy: { visitDate: 'desc' },
      }),
      prisma.fieldIssue.findMany({
        where: { reportedById: officer.id, ...(dateFilter ? { createdAt: dateFilter } : {}) },
        select: { id: true, issueType: true, severity: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.farmer.count({ where: { assignedOfficerId: officer.id } }),
    ]);

    const farmsVisited = new Set([
      ...inspections.map(i => i.farmerId),
      ...monitoringVisits.map(m => m.farmerId),
    ].filter(Boolean)).size;

    const survivalPcts = monitoringVisits.map(v => v.survivalPct).filter((p): p is number => p != null);
    const avgSurvivalPct = survivalPcts.length ? Math.round(survivalPcts.reduce((a, b) => a + b, 0) / survivalPcts.length) : null;

    const treesChecked = monitoringVisits.reduce((s, v) => s + v._count.treeSamples, 0);

    // Recent activity feed, merged and sorted — the closest real substitute
    // for the spec's "Hours Active" until a genuine attendance/session
    // system exists: at least shows when the officer was actually working.
    const activity = [
      ...treeImages.map(t => ({ type: 'photo' as const, at: t.capturedAt, label: `Photographed ${t.treeTag || 'a tree'}` })),
      ...inspections.map(i => ({ type: 'inspection' as const, at: i.inspectedAt || i.createdAt, label: 'Farm visit / land verification' })),
      ...monitoringVisits.map(m => ({ type: 'monitoring' as const, at: m.visitDate, label: `Health check — ${m._count.treeSamples} trees` })),
      ...issueReports.map(iss => ({ type: 'issue' as const, at: iss.createdAt, label: `Reported ${iss.issueType.replace(/_/g, ' ').toLowerCase()} (${iss.severity})` })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 30);

    return NextResponse.json({
      officer: { id: officer.id, name: officer.name, designation: officer.designation, district: officer.district, lastLoginAt: officer.lastLoginAt },
      period,
      metrics: {
        treesPhotographed: treeImages.length,
        farmsVisited,
        assignedFarmerCount,
        avgSurvivalPct,
        treesHealthChecked: treesChecked,
        inspectionsCompleted: inspections.filter(i => i.status === 'COMPLETED').length,
        issuesReported: issueReports.length,
        // Hours Active still has no real data source — no attendance/
        // session-tracking system exists yet, so this stays honest rather
        // than fabricated, same reasoning as before.
        hoursActive: null,
      },
      activity,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
