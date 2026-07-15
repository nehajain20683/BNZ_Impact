export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN','SUPER_ADMIN'].includes((session.user as any).role))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [donationAgg, farmerCount, siteCount, siteAgg, assignmentCount, recentDonations, recentSites] =
      await Promise.all([
        prisma.donation.aggregate({
          where: { paymentStatus: 'COMPLETED' },
          _sum:   { amount: true, numberOfTrees: true },
          _count: { id: true },
        }).catch(() => ({ _sum: { amount: 0, numberOfTrees: 0 }, _count: { id: 0 } })),

        prisma.farmer.count().catch(() => 0),

        prisma.plantationSite.count({ where: { active: true } }).catch(() => 0),

        prisma.plantationSite.aggregate({
          _sum: { treesPlanted: true, plannedTrees: true, totalPlannedArea: true }
        }).catch(() => ({ _sum: { treesPlanted: 0, plannedTrees: 0, totalPlannedArea: 0 } })),

        prisma.landAssignment.count().catch(() => 0),

        prisma.donation.findMany({
          take: 8, orderBy: { createdAt: 'desc' },
          include: { campaign: { select: { name: true } } },
        }).catch(() => []),

        prisma.plantationSite.findMany({
          where: { active: true }, take: 4, orderBy: { createdAt: 'desc' },
          select: { id: true, siteName: true, siteCode: true, currentPhase: true,
                    treesPlanted: true, plannedTrees: true, district: true, state: true,
                    plantationPartner: true },
        }).catch(() => []),
      ]);

    return NextResponse.json({
      stats: {
        totalAmount:     donationAgg._sum.amount      || 0,
        totalTrees:      donationAgg._sum.numberOfTrees || 0,
        totalDonations:  donationAgg._count.id         || 0,
        farmerCount,
        siteCount,
        treesPlanted:    siteAgg._sum.treesPlanted    || 0,
        plannedTrees:    siteAgg._sum.plannedTrees    || 0,
        totalArea:       siteAgg._sum.totalPlannedArea || 0,
        assignmentCount,
      },
      recentDonations,
      recentSites,
    });
  } catch (e: any) {
    console.error('[admin/dashboard]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
