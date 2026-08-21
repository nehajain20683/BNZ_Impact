export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { resolveTenantFromRequest } from '@/lib/tenant';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const org = await resolveTenantFromRequest(req);

    const [farmerCount, siteAgg, donationAgg] = await Promise.all([
      prisma.farmer.count({ where: { orgId: org.id } }).catch(() => 0),
      prisma.plantationSite.aggregate({
        where: { orgId: org.id, active: true },
        _sum:  { treesPlanted: true, plannedTrees: true },
        _count:{ id: true },
      }).catch(() => ({ _sum: { treesPlanted: 0, plannedTrees: 0 }, _count: { id: 0 } })),
      prisma.donation.aggregate({
        where: { orgId: org.id, paymentStatus: 'COMPLETED' },
        _sum:  { amount: true, numberOfTrees: true },
        _count:{ id: true },
      }).catch(() => ({ _sum: { amount: 0, numberOfTrees: 0 }, _count: { id: 0 } })),
    ]);

    const treesPlanted     = siteAgg._sum.treesPlanted    || 0;
    const estimatedCarbon  = Math.round(treesPlanted * 0.022 * 0.87 * 25);

    return NextResponse.json({
      treesPlanted,
      plannedTrees:    siteAgg._sum.plannedTrees   || 0,
      siteCount:       siteAgg._count.id            || 0,
      farmerCount,
      estimatedCarbon,
      totalDonations:  donationAgg._count.id        || 0,
      totalAmount:     donationAgg._sum.amount      || 0,
      treesDonated:    donationAgg._sum.numberOfTrees || 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
