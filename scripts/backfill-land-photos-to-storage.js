// scripts/backfill-land-photos-to-storage.js
// Moves land photos that are still stored as base64 text inside the database into
// Supabase Storage, replacing each with its Storage path. After this, reading a land
// no longer drags megabytes out of Postgres, and the photos are served from the CDN.
//
//   node scripts/backfill-land-photos-to-storage.js            # DRY RUN: only measures; transfers nothing
//   node scripts/backfill-land-photos-to-storage.js --apply    # really migrate
//
// Needs (PowerShell):  $env:DATABASE_URL, $env:SUPABASE_URL, $env:SUPABASE_SERVICE_ROLE_KEY
//   SUPABASE_URL is the BARE project URL:  https://xxxx.supabase.co   (no /rest/v1 path)
//   and a PUBLIC bucket named "land-photos" must already exist.
//
// ⚠ COST: --apply reads every base64 photo out of the database (that is egress, once,
//   equal to the size the dry run prints). Check you have that much headroom first.
//
// Safe to re-run: photos that are already paths are never touched. If one upload fails,
// that photo keeps its original base64 (nothing is ever lost) and is listed at the end.
// Not reversible by the script itself — take a database backup first if you want a way back.

const { randomUUID } = require('crypto');

// The migration logic, with its database and uploader passed in so it can be tested
// without a real database or Storage.
async function migrateLands({ prisma, upload, apply, batchSize = 25, log = () => {} }) {
  const stats = { lands: 0, photos: 0, bytes: 0, failed: 0, failures: [] };
  let cursor = null;
  for (;;) {
    // Cursor paging, not offset: rows are being updated as we go, which shifts offsets.
    const lands = await prisma.land.findMany({
      where: { photos: { isEmpty: false } },
      select: { id: true, orgId: true, farmerId: true, photos: true },
      take: batchSize, orderBy: { id: 'asc' },
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (lands.length === 0) break;
    cursor = lands[lands.length - 1].id;

    for (const land of lands) {
      if (!land.photos.some(p => typeof p === 'string' && p.startsWith('data:'))) continue; // already migrated
      stats.lands++;
      const prefix = `${land.orgId || 'unassigned'}/${land.farmerId}`;
      const next = [];
      for (let i = 0; i < land.photos.length; i++) {
        const value = land.photos[i];
        if (typeof value !== 'string' || !value.startsWith('data:')) { next.push(value); continue; }
        stats.bytes += value.length;
        if (!apply) { next.push(value); stats.photos++; continue; }
        const path = `${prefix}/${randomUUID()}.jpg`;
        const r = await upload(path, value);
        if (!r.ok) { stats.failed++; stats.failures.push({ landId: land.id, index: i, reason: r.error }); next.push(value); continue; }
        next.push(path); stats.photos++;
      }
      if (apply) await prisma.land.update({ where: { id: land.id }, data: { photos: next } });
    }
    log(`  …${stats.lands} parcel(s), ${stats.photos} photo(s) so far`);
  }
  return stats;
}

const mb = n => (n / 1048576).toFixed(1) + ' MB';
function die(msg) { console.error('\n✗ ' + msg + '\n'); process.exit(1); }

async function main() {
  const apply = process.argv.includes('--apply');
  if (!process.env.DATABASE_URL) die('DATABASE_URL is not set.');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  // ── Dry run: measure with a tiny query — NO photo data is transferred. ──
  if (!apply) {
    try {
      const [r] = await prisma.$queryRawUnsafe(`
        SELECT count(*)::int AS lands,
               coalesce(sum((SELECT count(*) FROM unnest(photos) p WHERE p LIKE 'data:%')), 0)::int AS photos,
               coalesce(sum((SELECT sum(octet_length(p)) FROM unnest(photos) p WHERE p LIKE 'data:%')), 0)::bigint AS bytes
        FROM lands WHERE EXISTS (SELECT 1 FROM unnest(photos) p WHERE p LIKE 'data:%')`);
      console.log(`DRY RUN — ${r.lands} parcel(s) hold ${r.photos} photo(s) as base64, about ${mb(Number(r.bytes))}.`);
      console.log(`\nRunning with --apply will read that much out of the database ONCE (about ${mb(Number(r.bytes))} of egress),`);
      console.log('then upload it to Storage (uploads are free). Make sure this fits in what is left of your monthly quota.');
    } catch (e) { console.log('Could not measure the size automatically (' + e.message.split('\n')[0] + '). Nothing was changed.'); }
    console.log('\nNothing was changed. Re-run with --apply to migrate.');
    await prisma.$disconnect(); return;
  }

  // ── Apply: check everything BEFORE moving a single photo. ──
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) die('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.');
  if (/\/rest\/v1|\/storage\/v1|\/$/.test(url)) die(`SUPABASE_URL must be the bare project URL, like https://xxxx.supabase.co — yours is "${url}". (A /rest/v1 suffix is the usual mistake.)`);
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(url, key);
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) die('Could not reach Supabase Storage: ' + bErr.message + '\nCheck SUPABASE_SERVICE_ROLE_KEY (it must be the service_role key, not anon).');
  const bucket = (buckets || []).find(b => b.name === 'land-photos');
  if (!bucket) die('The "land-photos" bucket does not exist. Create it in Supabase → Storage → New bucket, tick "Public bucket".');
  if (!bucket.public) die('The "land-photos" bucket is not public, so photos would not display. Edit the bucket and enable "Public bucket".');

  const upload = async (path, dataUrl) => {
    const m = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
    if (!m) return { ok: false, error: 'not a valid base64 data URL' };
    const { error } = await supabase.storage.from('land-photos').upload(path, Buffer.from(m[2], 'base64'), { contentType: m[1], upsert: true, cacheControl: '31536000' });
    return error ? { ok: false, error: error.message } : { ok: true };
  };
  console.log('Checks passed (bucket exists and is public). Migrating…');
  const stats = await migrateLands({ prisma, upload, apply: true, log: console.log });
  console.log(`\nDone. ${stats.photos} photo(s) moved from ${stats.lands} parcel(s) (${mb(stats.bytes)} read). Failed: ${stats.failed}.`);
  for (const f of stats.failures) console.log(`  FAILED  land ${f.landId}, photo #${f.index}: ${f.reason}  (original kept)`);
  if (stats.failed) console.log('\nRe-run the same command to retry only the failed ones.');
  await prisma.$disconnect();
}

module.exports = { migrateLands };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
