export const runtime = 'nodejs';
// src/app/api/admin/users/[id]/route.ts
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

    const user = await prisma.user.findFirst({
      where: { id: params.id, orgId },
      select: {
        id: true, name: true, email: true, mobile: true, role: true,
        createdAt: true, emailVerified: true, image: true,
        address: true, pan: true, isActive: true, isLocked: true, lastLoginAt: true,
      },
    });
    if (!user) return NextResponse.json({ error: 'User not found in this organisation' }, { status: 404 });

    const donations = await prisma.donation.findMany({
      where: { userId: params.id },
      include: {
        campaign: { select: { name: true, slug: true } },
        trees: {
          select: {
            id: true, treeTagId: true, species: true, status: true, assignmentId: true,
            plantedDate: true, imageUrl: true, geoLatitude: true, geoLongitude: true,
            plantationSite: { select: { id: true, siteName: true, district: true, state: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const completed = donations.filter(d => d.paymentStatus === 'COMPLETED');
    const allTrees   = completed.flatMap(d => d.trees);

    const totalDonated  = completed.reduce((s, d) => s + d.amount, 0);
    const totalTrees    = completed.reduce((s, d) => s + d.numberOfTrees, 0);
    const campaignsSupported = [...new Set(completed.map(d => d.campaign?.name).filter(Boolean))];

    const statusBreakdown: Record<string, number> = {};
    for (const t of allTrees) statusBreakdown[t.status] = (statusBreakdown[t.status] || 0) + 1;

    // Matches the same Linked vs Not Yet Linked split shown on the donor's
    // own dashboard — a tree is "linked" once it has an actual farmer's
    // parcel assigned via "Link Sponsored Trees", not just a status value.
    const linkedTreeCount = allTrees.filter((t: any) => t.assignmentId).length;
    const unlinkedTreeCount = allTrees.length - linkedTreeCount;

    // Distinct plantation sites this user's trees are actually at
    const siteMap = new Map<string, any>();
    for (const t of allTrees) {
      if (t.plantationSite) siteMap.set(t.plantationSite.id, t.plantationSite);
    }
    const sites = Array.from(siteMap.values());

    // Verified field evidence — same "only published monitoring" rule as the donor dashboard
    const siteIds = sites.map(s => s.id);
    const verifiedVisits = siteIds.length
      ? await (prisma as any).monitoringVisit.findMany({
          where: { siteId: { in: siteIds }, donorVisible: true },
          select: { id: true, visitDate: true, survivalPct: true, site: { select: { siteName: true } } },
          orderBy: { visitDate: 'desc' },
          take: 10,
        }).catch(() => [])
      : [];

    const lastDonationAt = donations[0]?.createdAt || null;
    const firstDonationAt = donations[donations.length - 1]?.createdAt || null;

    return NextResponse.json({
      user,
      summary: {
        totalDonated, totalTrees, totalDonations: donations.length,
        completedDonations: completed.length,
        pendingDonations: donations.filter(d => d.paymentStatus === 'PENDING').length,
        failedDonations: donations.filter(d => d.paymentStatus === 'FAILED').length,
        campaignsSupported, statusBreakdown, linkedTreeCount, unlinkedTreeCount,
        sitesCount: sites.length,
        co2OffsetKg: totalTrees * 22,
        firstDonationAt, lastDonationAt,
      },
      donations: donations.map(d => ({
        id: d.id, receiptNumber: d.receiptNumber, campaignName: d.campaign?.name,
        amount: d.amount, numberOfTrees: d.numberOfTrees, paymentStatus: d.paymentStatus,
        createdAt: d.createdAt, dedicationName: d.dedicationName, treeCount: d.trees.length,
      })),
      trees: allTrees,
      sites,
      verifiedVisits,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
