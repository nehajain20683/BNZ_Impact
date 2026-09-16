// scripts/backfill-tree-photos-to-storage.js
// Run locally with your production DATABASE_URL, SUPABASE_URL, and
// SUPABASE_SERVICE_ROLE_KEY all set, after:
//   1. Creating the "tree-photos" bucket in your Supabase project
//      (Storage → New bucket → name it exactly "tree-photos", public)
//   2. Deploying the code changes that upload new photos to Storage
//
//   DATABASE_URL="postgres://..." SUPABASE_URL="https://xxx.supabase.co" \
//   SUPABASE_SERVICE_ROLE_KEY="..." node scripts/backfill-tree-photos-to-storage.js
//
// Finds every TreeImage row still holding a raw base64 data URL (new
// uploads since deployment already store a Storage path, so this only
// ever touches the backlog, never re-processes already-migrated rows —
// safe to re-run if interrupted partway through).
//
// Processes in batches of 200 by default — override with BATCH_SIZE env
// var if you want smaller/larger batches. Each row's original base64
// content is decoded, uploaded to the tree-photos bucket at
// {orgId}/{treeId}/{uuid}.jpg, and the database row is updated to store
// that path instead — only after the upload itself is confirmed to
// succeed, so a failed upload never leaves a row silently broken.

const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '200', 10);

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.');
    process.exit(1);
  }
  return createClient(url, key);
}

async function uploadOne(supabase, path, base64DataUrl) {
  const match = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { ok: false, error: 'Not a valid base64 data URL' };
  const [, contentType, base64Data] = match;
  const buffer = Buffer.from(base64Data, 'base64');
  const { error } = await supabase.storage.from('tree-photos').upload(path, buffer, { contentType, upsert: true });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function main() {
  const supabase = getSupabase();

  let totalProcessed = 0, totalSucceeded = 0, totalFailed = 0, totalSkippedNoOrg = 0;
  const failures = [];

  while (true) {
    // Only rows still holding raw base64 — matches exactly what the app
    // code checks before assuming a value is a real Storage path.
    const batch = await prisma.treeImage.findMany({
      where: { imageUrl: { startsWith: 'data:' } },
      select: { id: true, treeId: true, imageUrl: true, tenantId: true },
      take: BATCH_SIZE,
    });

    if (batch.length === 0) break;

    for (const row of batch) {
      totalProcessed++;
      if (!row.tenantId) {
        // Shouldn't happen given TreeImage.tenantId is required at write
        // time, but skip rather than guess if it ever does — logged for
        // manual follow-up rather than silently dropped.
        totalSkippedNoOrg++;
        failures.push({ id: row.id, reason: 'no tenantId on record' });
        continue;
      }
      const path = `${row.tenantId}/${row.treeId}/${randomUUID()}.jpg`;
      const result = await uploadOne(supabase, path, row.imageUrl);
      if (!result.ok) {
        totalFailed++;
        failures.push({ id: row.id, reason: result.error });
        continue;
      }
      await prisma.treeImage.update({ where: { id: row.id }, data: { imageUrl: path } });
      totalSucceeded++;
    }

    console.log(`Batch done — processed ${totalProcessed} so far (${totalSucceeded} succeeded, ${totalFailed} failed, ${totalSkippedNoOrg} skipped).`);
  }

  console.log('\n=== Backfill complete ===');
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Succeeded: ${totalSucceeded}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Skipped (no org): ${totalSkippedNoOrg}`);
  if (failures.length > 0) {
    console.log('\nFailures (investigate these manually, originals were left untouched):');
    for (const f of failures) console.log(`  ${f.id}: ${f.reason}`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
