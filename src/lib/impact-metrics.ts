// src/lib/impact-metrics.ts
// Computes each donor's attributed share of every org-defined impact metric
// (CO2 and beyond). A metric only appears if the admin has actually recorded
// at least one value for it — see docs on ImpactMetricDefinition.
import prisma from '@/lib/prisma';

export type DonorImpactMetric = {
  id:    string;
  name:  string;
  unit:  string;
  icon:  string;
  color: string;
  value: number;
};

// treeCountsBySite: e.g. { siteA: 20, siteB: 5 } — how many of the donor's
// trees are at each plantation site.
export async function computeDonorImpactMetrics(
  orgId: string | null | undefined,
  treeCountsBySite: Record<string, number>,
): Promise<DonorImpactMetric[]> {
  const siteIds = Object.keys(treeCountsBySite).filter(Boolean);
  if (!orgId || siteIds.length === 0) return [];

  try {
    return await computeDonorImpactMetricsInner(orgId, siteIds, treeCountsBySite);
  } catch (e: any) {
    // A newer metrics feature (e.g. a pending migration) must never break
    // the donor dashboard itself — degrade to "no extra metrics" instead.
    console.error('computeDonorImpactMetrics failed:', e.message);
    return [];
  }
}

async function computeDonorImpactMetricsInner(
  orgId: string,
  siteIds: string[],
  treeCountsBySite: Record<string, number>,
): Promise<DonorImpactMetric[]> {
  const [metrics, sites] = await Promise.all([
    (prisma as any).impactMetricDefinition.findMany({
      where: { orgId, active: true },
      include: { values: { where: { siteId: { in: siteIds } } } },
      orderBy: { displayOrder: 'asc' },
    }),
    prisma.plantationSite.findMany({
      where: { id: { in: siteIds } },
      select: { id: true, treesPlanted: true },
    }),
  ]);

  const siteTreesPlanted: Record<string, number> = {};
  for (const s of sites) siteTreesPlanted[s.id] = s.treesPlanted || 0;

  const results: DonorImpactMetric[] = [];

  for (const metric of metrics) {
    if (!metric.values || metric.values.length === 0) continue; // hidden until admin records data

    // Sum recorded values per site (supports multiple periods per site)
    const valueBySite: Record<string, number> = {};
    for (const v of metric.values) {
      valueBySite[v.siteId] = (valueBySite[v.siteId] || 0) + v.value;
    }

    let total = 0;
    for (const siteId of siteIds) {
      const donorTrees = treeCountsBySite[siteId] || 0;
      const siteValue  = valueBySite[siteId];
      if (!siteValue || donorTrees === 0) continue;

      if (metric.calculationType === 'PER_TREE') {
        // Recorded value is a flat per-tree rate for that site
        total += siteValue * donorTrees;
      } else {
        // SITE_PROPORTIONAL — donor's share of the site's total recorded value
        const siteTotalTrees = siteTreesPlanted[siteId] || 0;
        if (siteTotalTrees > 0) {
          total += siteValue * (donorTrees / siteTotalTrees);
        }
      }
    }

    if (total > 0) {
      results.push({
        id: metric.id, name: metric.name, unit: metric.unit,
        icon: metric.icon || '🌿', color: metric.color || '#2d5a1b',
        value: total,
      });
    }
  }

  return results;
}
