// src/lib/land-owner-term.ts
// Presentation-only conditional label — deliberately does NOT rename the
// underlying Farmer model, farmerId fields, or any API route. That would
// mean rewriting essentially every route and page built across this whole
// project, an extremely high-risk change for what's fundamentally a
// display decision. Instead: the code stays Farmer/farmerId everywhere,
// and this function decides what word to show a person, based on their
// own occupation or the land's plantation type — "Farmer" when either the
// occupation is (or contains) "Farmer" or the plantation type is
// Agroforestry, "Land Owner" otherwise. This keeps the platform equally
// natural for a pure agroforestry/farming project and for any other kind
// of tree-plantation project where "farmer" wouldn't fit the person at all.
export function getLandOwnerTerm(
  occupation?: string | null,
  plantationType?: string | null,
): { en: string; hi: string } {
  const isFarmerOccupation = !!occupation && occupation.toLowerCase().includes('farmer');
  const isAgroforestry = plantationType === 'AGROFORESTRY';
  return (isFarmerOccupation || isAgroforestry)
    ? { en: 'Farmer', hi: 'किसान' }
    : { en: 'Land Owner', hi: 'भूमि स्वामी' };
}
