export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const site = await prisma.plantationSite.findUnique({
      where: { id: params.id },
      include: {
        speciesPlans:    true,
        landAssignments: {
          include: { farmer: { select: { fullName: true } } },
        },
        _count: { select: { landAssignments: true, activities: true, monitoringVisits: true } },
      },
    });

    if (!site) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [visits, activities] = await Promise.all([
      prisma.monitoringVisit.findMany({ where: { siteId: params.id }, orderBy: { visitDate: 'asc' } }).catch(() => []),
      prisma.plantationActivity.findMany({ where: { siteId: params.id }, orderBy: { date: 'asc' } }).catch(() => []),
    ]);

    const assignments    = site.landAssignments;
    const totalPlanned   = site.plannedTrees || 0;
    const totalPlanted   = assignments.reduce((s, a) => s + (a.treesPlanted || 0), 0);
    const totalSurviving = assignments.reduce((s, a) => s + (a.treesSurviving || 0), 0);
    const survivalPct    = totalPlanted > 0 ? (totalSurviving / totalPlanted) * 100 : 0;
    const latestVisit    = visits[visits.length - 1] || null;

    // Actual planted species mix — was previously site.speciesPlans, the
    // static target set once at site creation, never what's actually been
    // entered via "Update Plantation Data" across real farmer assignments.
    // Aggregated here from LandAssignment.speciesPlanted, the real source
    // of truth for what's genuinely in the ground.
    const actualSpeciesTotals: Record<string, number> = {};
    for (const a of assignments) {
      const list = (a.speciesPlanted as any[]) || [];
      for (const sp of list) {
        if (!sp?.species || !sp?.qty) continue;
        actualSpeciesTotals[sp.species] = (actualSpeciesTotals[sp.species] || 0) + sp.qty;
      }
    }
    const totalActualSpecies = Object.values(actualSpeciesTotals).reduce((s, n) => s + n, 0);
    const speciesBreakdown = Object.entries(actualSpeciesTotals)
      .map(([species, qty]) => ({
        species, planned: qty,
        pct: totalActualSpecies > 0 ? Math.round((qty / totalActualSpecies) * 100) : 0,
      }))
      .sort((a, b) => b.planned - a.planned);

    // Kept separately for reference — the original target mix, shown
    // alongside actual rather than replaced by it, so a real gap between
    // plan and reality stays visible instead of silently disappearing.
    const speciesPlanTargets = site.speciesPlans.map(sp => ({
      species: sp.species, planned: sp.plannedQty,
      pct: totalPlanned > 0 ? Math.round((sp.plannedQty / totalPlanned) * 100) : 0,
    }));

    const monthlyMap: Record<string, number> = {};
    for (const act of activities) {
      if (act.activityType === 'PLANTATION' && act.treesPlanted) {
        const key = new Date(act.date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        monthlyMap[key] = (monthlyMap[key] || 0) + act.treesPlanted;
      }
    }
    const monthlyProgress = Object.entries(monthlyMap).map(([month, trees]) => ({ month, trees }));

    const farmerProgress = assignments.slice(0, 10).map(a => ({
      name:       a.farmer.fullName,
      assigned:   a.treesAssigned,
      planted:    a.treesPlanted  || 0,
      surviving:  a.treesSurviving || 0,
      stage:      a.stage,
      species:    (a as any).speciesPlanted || [],
      driveLinks: (a as any).driveLinks    || [],
    }));

    return NextResponse.json({
      summary: {
        totalArea:       site.totalPlannedArea || 0,
        totalFarmers:    assignments.length,
        plannedTrees:    totalPlanned,
        treesPlanted:    totalPlanted,
        pendingTrees:    Math.max(0, totalPlanned - totalPlanted),
        survivalPct:     Math.round(survivalPct * 10) / 10,
        estimatedCarbon: site.estimatedCarbon  || 0,
        carbonCredits:   site.estimatedCredits || 0,
        partner:         site.plantationPartner || '—',
        currentPhase:    site.currentPhase,
        activityCount:   site._count.activities,
        monitoringCount: site._count.monitoringVisits,
      },
      speciesBreakdown,
      speciesPlanTargets,
      monthlyProgress,
      farmerProgress,
      latestVisit,
    });
  } catch (e: any) {
    console.error('[dashboard GET]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
