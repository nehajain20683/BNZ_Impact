// src/lib/methodology-engine.ts
// The real fix for the gap flagged repeatedly across this project: carbon.ts's
// flat per-tree constant is a consistent number, not a scientifically
// grounded one. This is what actually closes that gap — a genuine
// species-specific biomass calculation, used when a tree has real
// measured height, diameter, and a matched species equation; falling
// back to the existing flat estimate otherwise, since most trees won't
// have all three yet.
//
// IMPORTANT — read before using this for anything registry-facing:
// This uses PUBLISHED, PEER-REVIEWED equations and IPCC default
// conversion factors, not anything invented for this project:
//   - Chave et al. (2014), "Improved allometric models to estimate the
//     aboveground biomass of tropical trees," Global Change Biology —
//     the standard pantropical AGB equation, widely cited in forestry
//     carbon science: AGB(kg) = 0.0673 × (ρ × D² × H)^0.976
//   - IPCC (2006) default root-to-shoot ratio (0.24) for tropical/
//     subtropical forest, converting AGB to total (above+below-ground)
//     biomass
//   - IPCC default carbon fraction of dry biomass (0.47), and the
//     standard 44/12 molecular weight ratio converting carbon mass to
//     CO2 mass
//
// Wood density values below are standard reference values for common
// species, not lab-measured for your specific trees. This is a genuine
// step up in scientific rigor from a flat constant — it is NOT the same
// as a third-party-verified methodology (VM0047 etc.), and these values
// should be reviewed by a forestry/agronomy professional before being
// used in any actual registry submission. Flagging this plainly rather
// than presenting it as more certain than it is.

export type BiomassResult = {
  method: 'MEASURED' | 'FLAT_ESTIMATE';
  co2eKg: number;
  agbKg?: number;
  woodDensityUsed?: number;
  equationSource?: string;
};

// Standard reference wood density (g/cm³) for species commonly used in
// Indian plantation programs, from published forestry sources (Global
// Wood Density Database / ICRAF / FAO reference ranges). Bamboo is
// deliberately excluded — it's not a solid-wood stem in the same sense
// (hollow, different growth form), and using the same equation would
// give a meaningless number; it needs its own model this project
// doesn't have yet, so bamboo always falls back to the flat estimate.
export const SPECIES_WOOD_DENSITY: Record<string, number> = {
  'Neem': 0.56,
  'Mango': 0.50,
  'Teak': 0.60,
  'Eucalyptus': 0.55,
  'Gulmohar': 0.40,
  'Banyan': 0.38,
  'Peepal': 0.38,
  'Jamun': 0.65,
  'Karanj': 0.58,
  'Subabul': 0.55,
};

const ROOT_TO_SHOOT_RATIO = 0.24; // IPCC 2006 default, tropical/subtropical forest
const CARBON_FRACTION = 0.47;      // IPCC default, dry biomass to carbon
const CO2_TO_C_RATIO = 44 / 12;    // molecular weight, carbon to CO2

// height in meters, diameter in cm — matches this app's existing
// MonitoringTreeSample units (height stored in cm elsewhere in this app,
// so callers must convert to meters before calling this).
function chaveAGB(woodDensity: number, diameterCm: number, heightM: number): number {
  return 0.0673 * Math.pow(woodDensity * Math.pow(diameterCm, 2) * heightM, 0.976);
}

export function calculateTreeCarbon(input: {
  species: string | null;
  latestHeightCm: number | null;
  latestDiameterCm: number | null;
  flatEstimateCO2Kg: number; // the existing constant-based figure, as fallback
}): BiomassResult {
  const woodDensity = input.species ? SPECIES_WOOD_DENSITY[input.species] : undefined;
  const hasMeasurements = input.latestHeightCm != null && input.latestDiameterCm != null && input.latestHeightCm > 0 && input.latestDiameterCm > 0;

  if (!woodDensity || !hasMeasurements) {
    return { method: 'FLAT_ESTIMATE', co2eKg: input.flatEstimateCO2Kg };
  }

  const heightM = input.latestHeightCm! / 100;
  const agbKg = chaveAGB(woodDensity, input.latestDiameterCm!, heightM);
  const totalBiomassKg = agbKg * (1 + ROOT_TO_SHOOT_RATIO);
  const carbonKg = totalBiomassKg * CARBON_FRACTION;
  const co2eKg = carbonKg * CO2_TO_C_RATIO;

  return {
    method: 'MEASURED', co2eKg: Math.round(co2eKg * 10) / 10,
    agbKg: Math.round(agbKg * 10) / 10, woodDensityUsed: woodDensity,
    equationSource: 'Chave et al. (2014) pantropical AGB equation, IPCC default conversion factors',
  };
}
