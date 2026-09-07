export const runtime = 'nodejs';
// src/app/api/admin/field-issues/route.ts
// dMRV Roadmap Phase 4. FieldIssue was captured by officers with a full
// status workflow already in the schema (OPEN | ACKNOWLEDGED | RESOLVED,
// resolutionNotes, resolvedAt) but genuinely zero admin API or UI existed
// anywhere to see or act on it — confirmed by search before writing this.
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
    const status = params.get('status') || 'OPEN';
    const severity = params.get('severity');

    const where: any = { site: { orgId } };
    if (status !== 'ALL') where.status = status;
    if (severity) where.severity = severity;

    const issues = await prisma.fieldIssue.findMany({
      where,
      include: {
        site: { select: { siteName: true, district: true, state: true } },
        farmer: { select: { fullName: true, mobile: true } },
        tree: { select: { treeTagId: true } },
        reportedBy: { select: { name: true, mobile: true } },
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });

    const counts = await prisma.fieldIssue.groupBy({
      by: ['status'],
      where: { site: { orgId } },
      _count: { _all: true },
    });
    const statusCounts: Record<string, number> = {};
    for (const c of counts) statusCounts[c.status] = c._count._all;

    return NextResponse.json({ issues, statusCounts });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
