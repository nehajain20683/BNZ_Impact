export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN','SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const type  = new URL(req.url).searchParams.get('type') || 'donations';

    let csv = '';

    if (type === 'donations') {
      const donations = await prisma.donation.findMany({
        where:   { orgId },
        orderBy: { createdAt: 'desc' },
        include: { campaign: { select: { name: true } } },
      });
      csv = [
        'Ref ID,Donor Name,Email,Mobile,PAN,Campaign,Trees,Amount,Status,Date',
        ...donations.map(d => [
          d.refId || '', d.donorName, d.donorEmail || '', d.donorMobile || '',
          d.donorPan || '', d.campaign?.name || '', d.numberOfTrees,
          d.amount, d.paymentStatus,
          new Date(d.createdAt).toLocaleDateString('en-IN'),
        ].map(v => `"${v}"`).join(',')),
      ].join('\n');
    }

    if (type === 'farmers') {
      const farmers = await prisma.farmer.findMany({
        where:   { orgId },
        orderBy: { createdAt: 'desc' },
      });
      csv = [
        'Farmer ID,Name,Mobile,Village,District,State,Status,Registered',
        ...farmers.map(f => [
          f.farmerIdGenerated || '', f.fullName, f.mobile,
          f.village || '', f.district || '', f.state || '',
          f.status, new Date(f.createdAt).toLocaleDateString('en-IN'),
        ].map(v => `"${v}"`).join(',')),
      ].join('\n');
    }

    if (type === 'plantation') {
      const sites = await prisma.plantationSite.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        select: {
          siteName: true, district: true, state: true, currentPhase: true,
          treesPlanted: true, plannedTrees: true, totalPlannedArea: true,
          _count: { select: { landAssignments: true } },
        },
      });
      csv = [
        'Site Name,District,State,Phase,Trees Planted,Planned Trees,Area (acres),Farmers Assigned',
        ...sites.map(s => [
          s.siteName, s.district || '', s.state || '', s.currentPhase,
          s.treesPlanted, s.plannedTrees || '', s.totalPlannedArea || '',
          s._count.landAssignments,
        ].map(v => `"${v}"`).join(',')),
      ].join('\n');
    }

    if (type === 'carbon') {
      const sites = await prisma.plantationSite.findMany({
        where: { orgId, active: true },
        select: { siteName: true, treesPlanted: true },
      });
      // Same per-tree constant used consistently across the app's other
      // carbon estimates (public impact dashboard, CSR reports) — kept
      // identical here so this export never quietly disagrees with a
      // number the same org shows elsewhere.
      csv = [
        'Site Name,Trees Planted,Estimated CO2 Sequestered (kg/yr)',
        ...sites.map(s => [
          s.siteName, s.treesPlanted,
          Math.round(s.treesPlanted * 0.022 * 0.87 * 25 * 1000),
        ].map(v => `"${v}"`).join(',')),
      ].join('\n');
    }

    return new Response(csv, {
      headers: {
        'Content-Type':        'text/csv',
        'Content-Disposition': `attachment; filename="${type}-export-${Date.now()}.csv"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
