// scripts/backfill-farmer-ids.js
// Issues farmer IDs to farmers who were ALREADY verified before IDs started
// being issued at verification. IDs are permanent, so this is a DRY RUN by
// default — it prints exactly what would be issued and changes nothing.
//
//   node scripts/backfill-farmer-ids.js                  # dry run (default)
//   node scripts/backfill-farmer-ids.js --apply          # really issue them
//   node scripts/backfill-farmer-ids.js --org=<orgId>    # limit to one organisation
//
// Needs DATABASE_URL, and `npx prisma db push` already run (creates the
// farmer_id_counters table). Farmers are numbered in registration order.
// Uses the SAME code as the live verification flow (src/lib/farmer-id-core.ts,
// transpiled on the fly), so a backfilled ID is identical to a live one.
// Safe to re-run: farmers who already have an ID are never touched.

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

  const farmers = await prisma.farmer.findMany({
    where: { farmerIdGenerated: null, status: 'VERIFIED_LAND_OWNER', ...(orgId ? { orgId } : {}) },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, fullName: true, state: true, district: true,
      organization: { select: { name: true, farmer_id_prefix: true } },
      lands: { select: { state: true, district: true }, orderBy: { createdAt: 'asc' }, take: 5 },
    },
  });

  console.log(`${apply ? 'APPLY' : 'DRY RUN'} — ${farmers.length} verified farmer(s) without an ID${orgId ? ` in org ${orgId}` : ''}.\n`);
  if (farmers.length === 0) { await prisma.$disconnect(); return; }

  if (!apply) {
    let counters = {};
    try {
      const rows = await prisma.$queryRawUnsafe('SELECT "counterKey", "lastValue" FROM farmer_id_counters');
      for (const r of rows) counters[r.counterKey] = Number(r.lastValue);
    } catch {
      console.log('(farmer_id_counters table not found yet — run `npx prisma db push` before --apply. Previewing from zero.)\n');
    }
    const used = new Set((await prisma.farmer.findMany({ where: { farmerIdGenerated: { not: null } }, select: { farmerIdGenerated: true } })).map(f => f.farmerIdGenerated));
    const plan = core.planFarmerIds(farmers, counters, used);
    for (const p of plan) {
      console.log(`${p.id.padEnd(22)} ← ${p.farmer.fullName}  (${p.farmer.organization?.name || '?'})${p.locationFallback ? '   ⚠ district unknown → "XX" in the ID' : ''}`);
    }
    const warn = plan.filter(p => p.locationFallback).length;
    console.log(`\n${plan.length} ID(s) would be issued. NOTHING was changed.`);
    if (warn) console.log(`⚠ ${warn} would get "XX" because no district is on file for them or their land. IDs can't be changed once issued — fix those addresses first if you'd rather they carry a real district code.`);
    console.log('Re-run with --apply to issue them.');
    await prisma.$disconnect();
    return;
  }

  let issued = 0, failed = 0;
  for (const f of farmers) {
    try {
      const r = await core.assignFarmerIdWith(prisma, f.id, { role: 'SYSTEM' });
      if (r.assigned) { issued++; console.log(`${r.id.padEnd(22)} ← ${f.fullName}`); }
    } catch (e) { failed++; console.error(`FAILED ${f.fullName} (${f.id}): ${e.message}`); }
  }
  console.log(`\nIssued ${issued}, failed ${failed}.`);
  await prisma.$disconnect();
}

module.exports = { loadCore };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
