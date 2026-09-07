// scripts/backfill-tree-orgid.js
// Run locally with your production DATABASE_URL set, after applying the
// schema migration that adds Tree.orgId (nullable), e.g.:
//   DATABASE_URL="postgres://..." node scripts/backfill-tree-orgid.js
//
// Populates orgId on every existing Tree row from its donation's orgId —
// donationId is required on every Tree, so this is the single reliable
// source, the same one every Tree-creation code path now uses directly
// for new rows. Safe to re-run: only touches rows where orgId is
// currently null, does nothing to rows already populated.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const treesNeedingBackfill = await prisma.tree.findMany({
    where: { orgId: null },
    select: { id: true, donationId: true },
  });

  console.log(`${treesNeedingBackfill.length} tree(s) need backfilling.`);
  if (treesNeedingBackfill.length === 0) { await prisma.$disconnect(); return; }

  const donationIds = [...new Set(treesNeedingBackfill.map(t => t.donationId))];
  const donations = await prisma.donation.findMany({
    where: { id: { in: donationIds } },
    select: { id: true, orgId: true },
  });
  const orgIdByDonation = Object.fromEntries(donations.map(d => [d.id, d.orgId]));

  let updated = 0, skipped = 0;
  for (const tree of treesNeedingBackfill) {
    const orgId = orgIdByDonation[tree.donationId];
    if (!orgId) { skipped++; continue; } // genuinely orphaned donation, shouldn't happen but don't guess
    await prisma.tree.update({ where: { id: tree.id }, data: { orgId } });
    updated++;
  }

  console.log(`Backfilled ${updated} tree(s). Skipped ${skipped} (no resolvable donation.orgId — investigate these manually).`);
  await prisma.$disconnect();
}

main();
