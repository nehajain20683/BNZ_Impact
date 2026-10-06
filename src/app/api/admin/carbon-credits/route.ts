export const runtime = 'nodejs';
// src/app/api/admin/carbon-credits/route.ts
// Org-wide rollup, powering the dMRV Carbon Estimation overview page —
// the detailed, actionable ledger per site lives on each plantation
// site's own page (CarbonCreditsPanel); this is the read-only summary
// tying them together with links to drill into each.
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

export async function GET() {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();

    const credits = await (prisma as any).carbonCredit.findMany({
      where: { orgId },
      include: { site: { select: { id: true, siteName: true } }, farmer: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const bySite: Record<string, { siteId: string; siteName: string; totalIssued: number; totalSold: number; totalRetired: number; count: number }> = {};
    for (const c of credits) {
      const key = c.siteId || 'unassigned';
      if (!bySite[key]) bySite[key] = { siteId: c.siteId, siteName: c.site?.siteName || 'No site linked', totalIssued: 0, totalSold: 0, totalRetired: 0, count: 0 };
      bySite[key].totalIssued += c.creditsIssued || 0;
      bySite[key].totalSold += c.creditsSold || 0;
      bySite[key].totalRetired += c.creditsRetired || 0;
      bySite[key].count += 1;
    }

    const summary = {
      totalIssued: credits.reduce((s: number, c: any) => s + (c.creditsIssued || 0), 0),
      totalSold: credits.reduce((s: number, c: any) => s + (c.creditsSold || 0), 0),
      totalRetired: credits.reduce((s: number, c: any) => s + (c.creditsRetired || 0), 0),
      totalRevenueShared: credits.reduce((s: number, c: any) => s + (c.revenueShared || 0), 0),
      totalRecords: credits.length,
    };

    return NextResponse.json({ summary, bySite: Object.values(bySite), recentCredits: credits.slice(0, 10) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
