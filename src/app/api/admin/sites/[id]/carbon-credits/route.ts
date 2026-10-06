export const runtime = 'nodejs';
// src/app/api/admin/sites/[id]/carbon-credits/route.ts
// The real Carbon Credit Lifecycle, closing the last Tier 2 gap. The
// CarbonCredit model existed with zero code anywhere using it before
// this. Farmer-linked (this is fundamentally about revenue-sharing with
// the land owners whose parcels generated the credits), with an
// optional siteId so credits can also be viewed and managed at the
// aggregate site level.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';

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

    const credits = await (prisma as any).carbonCredit.findMany({
      where: { siteId: params.id, orgId },
      include: { farmer: { select: { id: true, fullName: true, village: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Farmers assigned to this site, for the "create credit" farmer
    // picker — only farmers whose land actually contributes to this
    // site should be selectable, not every farmer in the org.
    const assignments = await prisma.landAssignment.findMany({
      where: { siteId: params.id },
      select: { farmer: { select: { id: true, fullName: true, village: true } } },
    });
    const eligibleFarmers = Array.from(
      new Map(assignments.map(a => [a.farmer.id, a.farmer])).values()
    );

    const summary = {
      totalIssued: credits.reduce((s: number, c: any) => s + (c.creditsIssued || 0), 0),
      totalSold: credits.reduce((s: number, c: any) => s + (c.creditsSold || 0), 0),
      totalRetired: credits.reduce((s: number, c: any) => s + (c.creditsRetired || 0), 0),
      totalRevenueShared: credits.reduce((s: number, c: any) => s + (c.revenueShared || 0), 0),
    };

    return NextResponse.json({ credits, eligibleFarmers, summary });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const body = await req.json();

    const site = await prisma.plantationSite.findFirst({ where: { id: params.id, orgId } });
    if (!site) return NextResponse.json({ error: 'Site not found in this organisation' }, { status: 404 });

    if (!body.farmerId) return NextResponse.json({ error: 'farmerId is required' }, { status: 400 });
    const farmer = await prisma.farmer.findFirst({ where: { id: body.farmerId, orgId } });
    if (!farmer) return NextResponse.json({ error: 'Farmer not found in this organisation' }, { status: 404 });

    // Confirm this farmer's land is genuinely assigned to this site —
    // don't let a credit get attributed to a farmer with no actual
    // connection to the site it's supposedly from.
    const hasAssignment = await prisma.landAssignment.findFirst({ where: { siteId: params.id, farmerId: body.farmerId } });
    if (!hasAssignment) return NextResponse.json({ error: 'This farmer has no land assigned to this site' }, { status: 400 });

    const credit = await (prisma as any).carbonCredit.create({
      data: {
        farmerId: body.farmerId, orgId, siteId: params.id,
        vintageYear: body.vintageYear ? parseInt(body.vintageYear) : new Date().getFullYear(),
        creditsIssued: body.creditsIssued ? parseFloat(body.creditsIssued) : null,
        registry: body.registry || null,
        serialNumber: body.serialNumber || null,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ success: true, credit });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
