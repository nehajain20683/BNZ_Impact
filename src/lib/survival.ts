// src/lib/survival.ts
// Closes the risk flagged in the very first dMRV audit: survival % was
// computed inline in 4 places. Genuinely two different metrics, not one
// duplicated formula — kept as two functions rather than force-unifying
// them into something that would blur what each actually measures:
//
//   computeTreeStatusSurvivalPct — "of all trees currently on record for
//   this site/org, what % are not marked DEAD." An aggregate snapshot of
//   current state, used in the explanatory/CSR reports.
//
//   computeSampleSurvivalPct — "of the trees sampled during this one
//   monitoring visit, what % were found alive." A per-visit metric, used
//   when a MonitoringVisit/MonitoringTreeSample batch is recorded.
//
// Each function matches its original call sites' exact rounding
// precision — deliberately not "fixed" to be consistent with each other,
// since changing behavior wasn't what was asked; only removing the
// duplication was.

export function computeTreeStatusSurvivalPct(trees: { status: string }[]): number | null {
  if (trees.length === 0) return null;
  const deadCount = trees.filter(t => t.status === 'DEAD').length;
  return Math.round(((trees.length - deadCount) / trees.length) * 100);
}

// Same math as above, but for callers that have already aggregated counts
// (e.g. building a per-site breakdown) rather than a raw array of trees —
// genuinely the same formula, just a different input shape, so this
// exists rather than forcing every caller to reconstruct a fake array
// just to call the function above.
export function computeSurvivalPctFromCounts(total: number, deadCount: number): number | null {
  if (total <= 0) return null;
  return Math.round(((total - deadCount) / total) * 100);
}

// Matches monitoring-visits/route.ts's original precision — one decimal
// place — and its original need for the raw counts too, since those are
// stored directly on the MonitoringVisit record, not just the percentage.
export function computeSampleSurvivalPctDecimal(samples: { survived?: boolean | null }[]): { survivalCount: number; deadTrees: number; survivalPct: number; mortalityPct: number } | null {
  if (samples.length === 0) return null;
  const survivalCount = samples.filter(s => s.survived !== false).length;
  const deadTrees = samples.filter(s => s.survived === false).length;
  const survivalPct = Math.round((survivalCount / samples.length) * 1000) / 10;
  const mortalityPct = Math.round((100 - survivalPct) * 10) / 10;
  return { survivalCount, deadTrees, survivalPct, mortalityPct };
}

// Matches tree-sample/route.ts's original precision — whole number.
export function computeSampleSurvivalPctWhole(samples: { survived?: boolean | null }[]): { survivalPct: number; survivedCount: number; deadCount: number } | null {
  if (samples.length === 0) return null;
  const survivedCount = samples.filter(s => s.survived).length;
  const deadCount = samples.length - survivedCount;
  const survivalPct = Math.round((survivedCount / samples.length) * 100);
  return { survivalPct, survivedCount, deadCount };
}
