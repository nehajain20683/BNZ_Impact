export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const [site, visits, activities] = await Promise.all([
    prisma.plantationSite.findUnique({
      where: { id: params.id },
      include: {
        speciesPlans: true,
        landAssignments: { include: { farmer: { select: { fullName: true } } } },
        _count: { select: { landAssignments: true, activities: true, monitoringVisits: true } },
      },
    }),
    prisma.monitoringVisit.findMany({ where: { siteId: params.id }, orderBy: { visitDate: 'asc' } }),
    prisma.plantationActivity.findMany({ where: { siteId: params.id }, orderBy: { date: 'asc' } }),
  ]);
  if (!site) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const assignments = site.landAssignments;
  const totalPlanned = site.plannedTrees || 0;
  const totalPlanted = assignments.reduce((s, a) => s + a.treesPlanted, 0);
  const totalSurviving = assignments.reduce((s, a) => s + a.treesSurviving, 0);
  const survivalPct = totalPlanted > 0 ? (totalSurviving / totalPlanted) * 100 : 0;
  const latestVisit = visits[visits.length - 1];

  // Species breakdown
  const speciesBreakdown = site.speciesPlans.map(sp => ({
    species: sp.species,
    planned: sp.plannedQty,
    pct: totalPlanned > 0 ? Math.round((sp.plannedQty / totalPlanned) * 100) : 0,
  }));

  // Monthly progress from activities
  const monthlyMap: Record<string, number> = {};
  for (const act of activities) {
    if (act.activityType === 'PLANTATION' && act.treesPlanted) {
      const key = new Date(act.date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      monthlyMap[key] = (monthlyMap[key] || 0) + act.treesPlanted;
    }
  }
  const monthlyProgress = Object.entries(monthlyMap).map(([month, trees]) => ({ month, trees }));

  // Farmer progress
  const farmerProgress = assignments.slice(0, 10).map(a => ({
    name: a.farmer.fullName,
    assigned: a.treesAssigned,
    planted: a.treesPlanted,
    surviving: a.treesSurviving,
    stage: a.stage,
  }));

  return NextResponse.json({
    summary: {
      totalArea:       site.totalPlannedArea || 0,
      totalFarmers:    assignments.length,
      plannedTrees:    totalPlanned,
      treesPlanted:    totalPlanted,
      pendingTrees:    Math.max(0, totalPlanned - totalPlanted),
      survivalPct:     Math.round(survivalPct * 10) / 10,
      estimatedCarbon: site.estimatedCarbon || 0,
      carbonCredits:   site.estimatedCredits || 0,
      partner:         site.plantationPartner || '—',
      currentPhase:    site.currentPhase,
      activityCount:   site._count.activities,
      monitoringCount: site._count.monitoringVisits,
    },
    speciesBreakdown,
    monthlyProgress,
    farmerProgress,
    latestVisit,
  });
}
