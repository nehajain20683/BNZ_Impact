// scripts/seed-methodology.js
// Creates one real Methodology record and the species wood-density data
// from src/lib/methodology-engine.ts, linked together, then sets it as
// the org's default in TenantCarbonConfig. This is what makes Registry
// Readiness's "Carbon methodology assigned" check genuinely true instead
// of permanently false — before this, Methodology/SpeciesEquation
// existed as schema with nothing in them.
//
// Deliberately per-org, not run automatically for every tenant — an org
// may plant different species than the 10 seeded here, or may not want
// this at all yet. Run explicitly for orgs that are ready for it:
//
//   DATABASE_URL="postgres://..." node scripts/seed-methodology.js <orgId>
//
// Safe to re-run for the same org — uses the species name as the
// uniqueness check and skips any that already exist, rather than
// creating duplicates.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mirrors SPECIES_WOOD_DENSITY in src/lib/methodology-engine.ts — keep
// these in sync if that list changes.
const SPECIES_WOOD_DENSITY = {
  'Neem': 0.56, 'Mango': 0.50, 'Teak': 0.60, 'Eucalyptus': 0.55,
  'Gulmohar': 0.40, 'Banyan': 0.38, 'Peepal': 0.38, 'Jamun': 0.65,
  'Karanj': 0.58, 'Subabul': 0.55,
};

async function main() {
  const orgId = process.argv[2];
  if (!orgId) {
    console.error('Usage: node scripts/seed-methodology.js <orgId>');
    process.exit(1);
  }

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) { console.error(`No organisation found with id ${orgId}`); process.exit(1); }

  console.log(`Seeding methodology for: ${org.name}`);

  let methodology = await prisma.methodology.findFirst({ where: { orgId, formulaType: 'CHAVE_2014_PANTROPICAL' } });
  if (!methodology) {
    methodology = await prisma.methodology.create({
      data: { orgId, name: 'Standard Biomass Estimate (Chave et al. 2014, IPCC defaults)', formulaType: 'CHAVE_2014_PANTROPICAL' },
    });
    console.log(`Created Methodology: ${methodology.id}`);
  } else {
    console.log(`Methodology already exists: ${methodology.id}`);
  }

  let created = 0, skipped = 0;
  for (const [species, woodDensity] of Object.entries(SPECIES_WOOD_DENSITY)) {
    const existing = await prisma.speciesEquation.findFirst({ where: { methodologyId: methodology.id, species } });
    if (existing) { skipped++; continue; }
    await prisma.speciesEquation.create({
      data: {
        species, woodDensity, methodologyId: methodology.id,
        allometricEquation: 'Chave et al. (2014): AGB(kg) = 0.0673 × (ρ × D² × H)^0.976',
      },
    });
    created++;
  }
  console.log(`Species equations: ${created} created, ${skipped} already existed.`);

  await prisma.tenantCarbonConfig.upsert({
    where: { orgId },
    update: { defaultMethodologyId: methodology.id },
    create: { orgId, defaultMethodologyId: methodology.id },
  });
  console.log('TenantCarbonConfig updated — this methodology is now the org default.');

  console.log('\nDone. Registry Readiness for any site in this org will now show "Carbon methodology assigned" as true.');
  console.log('Reminder: wood density values are standard reference values, not lab-measured for this org\'s specific trees — worth a forestry professional\'s review before any real registry submission.');

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
