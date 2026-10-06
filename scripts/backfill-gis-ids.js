// scripts/backfill-gis-ids.js
// Issues GIS IDs to land parcels whose boundary was captured BEFORE GIS IDs were
// issued automatically. IDs are permanent, so this is a DRY RUN by default —
// it prints exactly what would be issued and changes nothing.
//
//   node scripts/backfill-gis-ids.js                  # dry run (default)
//   node scripts/backfill-gis-ids.js --apply          # really issue them
//   node scripts/backfill-gis-ids.js --org=<orgId>    # limit to one organisation
//
// Needs DATABASE_URL, and `npx prisma db push` already run (adds Land.gisId and
// the farmer_id_counters table). Parcels are numbered in the order they were
// created. Uses the SAME code as the live flow (src/lib/farmer-id-core.ts,
// transpiled on the fly), so a backfilled ID is identical to a live one.
// Safe to re-run: parcels that already have an ID are never touched, and parcels
// without a real boundary (fewer than 3 points) are skipped.

const fs = require('fs');
const path = require('path');

function loadCore() {
  const ts = require('typescript');
  const file = path.join(__dirname, '..', 'src', 'lib', 'farmer-id-core.ts');
  const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', out)(mod, mod.exports, require);
  return mod.exports;
}

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const core = loadCore();
  const apply = process.argv.includes('--apply');
  const orgId = (process.argv.find(a => a.startsWith('--org=')) || '').slice(6) || null;

  const candidates = await prisma.land.findMany({
    where: { gisId: null, ...(orgId ? { farmer: { orgId } } : {}) },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, surveyGutNumber: true, village: true, state: true, district: true, polygonGeoJson: true,
      farmer: { select: { fullName: true, state: true, district: true, organization: { select: { name: true, farmer_id_prefix: true } } } },
    },
  });
  const lands = candidates.filter(l => core.hasBoundary(l.polygonGeoJson));
  const skipped = candidates.length - lands.length;

  console.log(`${apply ? 'APPLY' : 'DRY RUN'} — ${lands.length} parcel(s) with a captured boundary and no GIS ID${orgId ? ` in org ${orgId}` : ''}` +
    `${skipped ? ` (${skipped} other parcel(s) have no boundary yet and are skipped)` : ''}.\n`);
  if (lands.length === 0) { await prisma.$disconnect(); return; }

  const label = l => `${l.farmer?.fullName || '?'} — survey ${l.surveyGutNumber || '—'}, ${l.village || '—'}`;

  if (!apply) {
    let counters = {};
    try {
      const rows = await prisma.$queryRawUnsafe('SELECT "counterKey", "lastValue" FROM farmer_id_counters');
      for (const r of rows) counters[r.counterKey] = Number(r.lastValue);
    } catch {
      console.log('(farmer_id_counters table not found yet — run `npx prisma db push` before --apply. Previewing from zero.)\n');
    }
    const used = new Set((await prisma.land.findMany({ where: { gisId: { not: null } }, select: { gisId: true } })).map(l => l.gisId));
    const plan = core.planGisIds(lands, counters, used);
    for (const p of plan) {
      console.log(`${p.id.padEnd(22)} ← ${label(p.land)}${p.locationFallback ? '   ⚠ district unknown → "XX" in the ID' : ''}`);
    }
    const warn = plan.filter(p => p.locationFallback).length;
    console.log(`\n${plan.length} ID(s) would be issued. NOTHING was changed.`);
    if (warn) console.log(`⚠ ${warn} would get "XX" because neither the parcel nor its farmer has a district on file. IDs can't be changed once issued — fix those addresses first if you'd rather they carry a real district code.`);
    console.log('Re-run with --apply to issue them.');
    await prisma.$disconnect();
    return;
  }

  let issued = 0, failed = 0;
  for (const l of lands) {
    try {
      const r = await core.assignLandGisIdWith(prisma, l.id, { role: 'SYSTEM' });
      if (r.assigned) { issued++; console.log(`${r.id.padEnd(22)} ← ${label(l)}`); }
    } catch (e) { failed++; console.error(`FAILED ${label(l)} (${l.id}): ${e.message}`); }
  }
  console.log(`\nIssued ${issued}, failed ${failed}.`);
  await prisma.$disconnect();
}

module.exports = { loadCore };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
