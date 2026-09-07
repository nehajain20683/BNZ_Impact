// src/lib/sampling.ts
// Real Sampling Design Engine, confirmed as a genuine requirement — not a
// UI placeholder. Per-tree monitoring remains the default and is
// untouched by any of this; these are the three methods available when a
// program is large enough that 100% per-tree monitoring becomes
// operationally impractical.
//
// Pure functions, no database access — callers fetch tree data themselves
// (already org/site-scoped by their own query) and pass it in, matching
// every other computation service in this codebase (carbon, survival,
// trust score, due-status).
//
// Uses a proper Fisher-Yates shuffle, not the common
// `.sort(() => Math.random() - 0.5)` pattern — that produces a measurably
// biased distribution, which matters here: a sampling plan that's
// supposed to be statistically representative shouldn't itself be built
// on a biased shuffle.

export type SampleableTree = { id: string; species: string | null; assignmentId: string | null };

function fisherYatesShuffle<T>(arr: T[], rand: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export type SamplingResult = {
  method: 'RANDOM' | 'STRATIFIED' | 'PLOT_BASED';
  totalPopulation: number;
  sampleSize: number;
  trees: { treeId: string; stratum?: string; plotCode?: string }[];
  plots: { plotCode: string; stratum?: string; assignmentId?: string; treeCount: number }[];
};

// Simple random sample across the whole population — no grouping.
export function generateRandomSample(trees: SampleableTree[], targetPct: number, rand: () => number = Math.random): SamplingResult {
  const targetSize = Math.max(1, Math.round(trees.length * (targetPct / 100)));
  const shuffled = fisherYatesShuffle(trees, rand);
  const selected = shuffled.slice(0, Math.min(targetSize, trees.length));
  return {
    method: 'RANDOM', totalPopulation: trees.length, sampleSize: selected.length,
    trees: selected.map(t => ({ treeId: t.id })),
    plots: [{ plotCode: 'ALL', treeCount: selected.length }],
  };
}

// Proportional-by-species — standard forestry stratification. Each
// species stratum contributes trees in proportion to its own share of
// the population, not an equal split across species regardless of size.
export function generateStratifiedSample(trees: SampleableTree[], targetPct: number, rand: () => number = Math.random): SamplingResult {
  const strata = new Map<string, SampleableTree[]>();
  for (const t of trees) {
    const key = t.species || 'Unknown';
    if (!strata.has(key)) strata.set(key, []);
    strata.get(key)!.push(t);
  }

  const selectedTrees: { treeId: string; stratum: string }[] = [];
  const plots: { plotCode: string; stratum: string; treeCount: number }[] = [];
  for (const [stratum, group] of strata) {
    const size = Math.max(1, Math.round(group.length * (targetPct / 100)));
    const shuffled = fisherYatesShuffle(group, rand);
    const selected = shuffled.slice(0, Math.min(size, group.length));
    for (const t of selected) selectedTrees.push({ treeId: t.id, stratum });
    plots.push({ plotCode: stratum, stratum, treeCount: selected.length });
  }

  return { method: 'STRATIFIED', totalPopulation: trees.length, sampleSize: selectedTrees.length, trees: selectedTrees, plots };
}

// Selects a representative subset of land parcels (LandAssignment is
// already a real geographic unit) and fully samples every tree within
// them — the classic forestry "representative plot" design, extrapolating
// from complete counts in a subset of plots rather than partial counts
// spread across every plot.
export function generatePlotBasedSample(trees: SampleableTree[], targetPct: number, rand: () => number = Math.random): SamplingResult {
  const plotGroups = new Map<string, SampleableTree[]>();
  for (const t of trees) {
    const key = t.assignmentId || 'unassigned';
    if (!plotGroups.has(key)) plotGroups.set(key, []);
    plotGroups.get(key)!.push(t);
  }

  const assignmentIds = [...plotGroups.keys()];
  const targetPlotCount = Math.max(1, Math.round(assignmentIds.length * (targetPct / 100)));
  const shuffledPlotIds = fisherYatesShuffle(assignmentIds, rand).slice(0, Math.min(targetPlotCount, assignmentIds.length));

  const selectedTrees: { treeId: string; plotCode: string }[] = [];
  const plots: { plotCode: string; assignmentId: string; treeCount: number }[] = [];
  shuffledPlotIds.forEach((assignmentId, i) => {
    const plotCode = `P-${String(i + 1).padStart(2, '0')}`;
    const group = plotGroups.get(assignmentId)!;
    for (const t of group) selectedTrees.push({ treeId: t.id, plotCode });
    plots.push({ plotCode, assignmentId, treeCount: group.length });
  });

  return { method: 'PLOT_BASED', totalPopulation: trees.length, sampleSize: selectedTrees.length, trees: selectedTrees, plots };
}

export function generateSamplingPlan(
  method: 'RANDOM' | 'STRATIFIED' | 'PLOT_BASED',
  trees: SampleableTree[],
  targetPct: number,
  rand: () => number = Math.random
): SamplingResult {
  if (method === 'STRATIFIED') return generateStratifiedSample(trees, targetPct, rand);
  if (method === 'PLOT_BASED') return generatePlotBasedSample(trees, targetPct, rand);
  return generateRandomSample(trees, targetPct, rand);
}
