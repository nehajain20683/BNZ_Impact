export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const orgId = await getActiveOrgId();

    const [donationAgg, farmerCount, siteCount, siteAgg, assignmentCount, recentDonations, recentSites] =
      await Promise.all([
        prisma.donation.aggregate({
          where: { paymentStatus: 'COMPLETED', orgId },
          _sum:  { amount: true, numberOfTrees: true },
          _count:{ id: true },
        }).catch(() => ({ _sum:{ amount:0, numberOfTrees:0 }, _count:{ id:0 } })),

        prisma.farmer.count({ where: { orgId } }).catch(() => 0),

        prisma.plantationSite.count({ where: { active: true, orgId } }).catch(() => 0),

        prisma.plantationSite.aggregate({
          where: { orgId },
          _sum: { treesPlanted: true, plannedTrees: true, totalPlannedArea: true }
        }).catch(() => ({ _sum:{ treesPlanted:0, plannedTrees:0, totalPlannedArea:0 } })),

        prisma.landAssignment.count().catch(() => 0),

        prisma.donation.findMany({
          where: { orgId }, take: 8, orderBy: { createdAt: 'desc' },
          include: { campaign: { select: { name: true } } },
        }).catch(() => []),

        prisma.plantationSite.findMany({
          where: { active: true, orgId }, take: 4, orderBy: { createdAt: 'desc' },
          select: { id:true, siteName:true, siteCode:true, currentPhase:true,
                    treesPlanted:true, plannedTrees:true, district:true, state:true, plantationPartner:true },
        }).catch(() => []),
      ]);

    return NextResponse.json({
      stats: {
        totalAmount:    donationAgg._sum.amount       || 0,
        totalTrees:     donationAgg._sum.numberOfTrees || 0,
        totalDonations: donationAgg._count.id          || 0,
        farmerCount, siteCount,
        treesPlanted:   siteAgg._sum.treesPlanted     || 0,
        plannedTrees:   siteAgg._sum.plannedTrees     || 0,
        totalArea:      siteAgg._sum.totalPlannedArea || 0,
        assignmentCount,
      },
      recentDonations,
      recentSites,
      orgId,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
