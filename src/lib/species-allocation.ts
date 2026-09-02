// src/lib/species-allocation.ts
// Computes how many of a batch of N donor-sponsored trees should get each
// species, so the mix hits an org's target Main/Side ratio (e.g. 80% Main
// species like Mango, 20% Side species like Bamboo) rather than either one
// flat species for the whole batch or a naive mirror of whatever's planted.
//
// Within each category, the split across species is proportional to what's
// actually planted (LandAssignment.speciesPlanted) — a species that's 80%
// of this land's Main planting gets roughly 80% of the Main allocation too.
import prisma from '@/lib/prisma';

export type SpeciesAllocation = { species: string; count: number };

export async function computeSpeciesAllocation(
  orgId: string,
  speciesPlanted: Array<{ species: string; qty: number }>,
  totalCount: number,
): Promise<{ allocations: SpeciesAllocation[]; uncategorized: string[] }> {
  const validSpecies = (speciesPlanted || []).filter(s => s.species && s.qty > 0);

  if (validSpecies.length === 0 || totalCount <= 0) {
    return { allocations: [], uncategorized: [] };
  }

  // Look up each species' category for this org. Anything not explicitly
  // set as MAIN is treated as SIDE by default (never blocks allocation),
  // but is still reported back so admin can see what's uncategorized.
  const images = await (prisma as any).speciesImage.findMany({
    where: { orgId, species: { in: validSpecies.map(s => s.species) } },
    select: { species: true, category: true },
  }).catch(() => []);
  const categoryBySpeciesLower = new Map<string, string>(
    images.map((i: any) => [i.species.toLowerCase(), i.category || 'SIDE'])
  );
  const uncategorized = validSpecies
    .filter(s => !categoryBySpeciesLower.has(s.species.toLowerCase()))
    .map(s => s.species);

  const mainSpecies = validSpecies.filter(s => categoryBySpeciesLower.get(s.species.toLowerCase()) === 'MAIN');
  const sideSpecies = validSpecies.filter(s => categoryBySpeciesLower.get(s.species.toLowerCase()) !== 'MAIN');

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { main_tree_target_percent: true } }).catch(() => null);
  const mainTargetPct = org?.main_tree_target_percent ?? 80;

  // If a category is entirely absent on this land (e.g. no Main species
  // planted at all), the other category simply gets the full count —
  // there's nothing to split proportionally against.
  let mainTarget = mainSpecies.length > 0 ? Math.round(totalCount * (mainTargetPct / 100)) : 0;
  let sideTarget = totalCount - mainTarget;
  if (sideSpecies.length === 0) { mainTarget = totalCount; sideTarget = 0; }
  if (mainSpecies.length === 0) { sideTarget = totalCount; mainTarget = 0; }

  function splitProportionally(species: Array<{ species: string; qty: number }>, target: number): SpeciesAllocation[] {
    if (species.length === 0 || target <= 0) return [];
    const totalQty = species.reduce((s, sp) => s + sp.qty, 0);
    const raw = species.map(sp => ({ species: sp.species, exact: (sp.qty / totalQty) * target }));
    // Largest-remainder rounding so individual counts sum exactly to target,
    // not just approximately (plain Math.round on each can drift by ±1-2).
    const floored = raw.map(r => ({ species: r.species, count: Math.floor(r.exact), remainder: r.exact - Math.floor(r.exact) }));
    let shortfall = target - floored.reduce((s, f) => s + f.count, 0);
    floored.sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; i < shortfall; i++) floored[i % floored.length].count += 1;
    return floored.filter(f => f.count > 0).map(f => ({ species: f.species, count: f.count }));
  }

  const allocations = [
    ...splitProportionally(mainSpecies, mainTarget),
    ...splitProportionally(sideSpecies, sideTarget),
  ];

  return { allocations, uncategorized };
}
