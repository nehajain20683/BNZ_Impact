// src/lib/carbon.ts
// dMRV Roadmap Phase 1 — DRY fix, not a scientific fix. This is the exact
// same flat per-tree constant that was previously copy-pasted across 5
// files (admin dMRV dashboard, explanatory reports, CSV export, CSR
// report, public impact API) — moving it here closes the risk of it
// silently drifting between files if one gets edited and the others
// don't. It does NOT make the number scientifically rigorous — that's
// the Methodology Engine's job (dMRV Roadmap Phase 0C/future), which
// replaces this constant with species-specific allometric equations once
// there's a real registry tenant to build it for. Every caller of this
// file inherits that upgrade automatically once it exists, without
// needing to change their own code again.

// kg CO2 / tree / year — annual sequestration factor × average survival
// rate × the growth-horizon window used consistently across every report.
// Exported for display/reference; the actual calculation functions below
// deliberately do NOT multiply through this pre-reduced constant — see
// the note on estimateCO2Tonnes for why.
export const CO2_PER_TREE_TONNES = 0.022 * 0.87 * 25;
export const CO2_PER_TREE_KG = CO2_PER_TREE_TONNES * 1000;

// Deliberately chains the multiplication in the exact same left-to-right
// order as the 5 original call sites (treeCount * 0.022 * 0.87 * 25) —
// NOT treeCount * CO2_PER_TREE_TONNES. Floating-point multiplication
// isn't strictly associative: pre-reducing the constant first and
// multiplying by treeCount last produced off-by-one differences after
// rounding on 2 of 6 test cases when this was verified against the
// original formula. This phase's whole purpose is behavior-identical
// deduplication, so the calculation path matches exactly, even though
// it means this function can't just do `treeCount * CO2_PER_TREE_TONNES`.
export function estimateCO2Tonnes(treeCount: number): number {
  return Math.round((treeCount || 0) * 0.022 * 0.87 * 25);
}

export function estimateCO2Kg(treeCount: number): number {
  return Math.round((treeCount || 0) * 0.022 * 0.87 * 25 * 1000);
}
