// scripts/backfill-land-photos-to-storage.js
// Moves land photos that are still stored as base64 text inside the database into
// Supabase Storage, replacing each with its Storage path. After this, reading a land
// no longer drags megabytes out of Postgres, and the photos are served from the CDN.
//
//   node scripts/backfill-land-photos-to-storage.js            # DRY RUN: only measures; transfers nothing
//   node scripts/backfill-land-photos-to-storage.js --apply --limit=1   # trial: migrate ONE parcel, then check it in the app
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
const fs = require('fs');
const path = require('path');

// Reads KEY=VALUE lines from a .env file (comments, `export`, quotes and Windows line endings handled).
function parseEnvFile(text) {
  const out = {};
  for (const line of String(text).split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue;
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}
function firstLine(m) { return (String(m).split('\n').map(l => l.trim()).find(Boolean)) || 'unknown error'; }
const isPostgresUrl = v => /^postgres(ql)?:\/\//i.test(v || '');

// Which database to use. A real DATABASE_URL set in the terminal wins; but a missing one — or a
// leftover placeholder like "<your database url>" — falls back to the project's own .env file,
// which is what the Prisma CLI already uses. Returns { url, source } or { error }.
function resolveDatabaseUrl(processEnv, fileEnv) {
  if (isPostgresUrl(processEnv.DATABASE_URL)) return { url: processEnv.DATABASE_URL, source: 'the terminal (DATABASE_URL)' };
  if (isPostgresUrl(fileEnv.DATABASE_URL)) return { url: fileEnv.DATABASE_URL, source: 'your project .env file', replacedBad: !!processEnv.DATABASE_URL };
  const had = processEnv.DATABASE_URL ? `DATABASE_URL is set to "${processEnv.DATABASE_URL}", which is not a database address.` : 'DATABASE_URL is not set.';
  return { error: had + '\nIt must start with postgresql:// — copy the DATABASE_URL line from the .env file in your project folder (do not type the placeholder).' };
}

// A dropped connection (the pooler closing, a timeout) is retried a few times before giving up.
const TRANSIENT = /P1017|P1001|P1002|P2024|closed the connection|ECONNRESET|ETIMEDOUT|timed out|terminat/i;
async function withRetry(fn, { tries = 3, log = () => {}, sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  for (let attempt = 1; ; attempt++) {
    try { return await fn(); }
    catch (e) {
      if (!TRANSIENT.test(String(e.code || '') + ' ' + String(e.message)) || attempt >= tries) throw e;
      log(`  (connection dropped — retrying ${attempt}/${tries - 1} in ${attempt * 2}s)`);
      await sleep(attempt * 2000);
    }
  }
}
const isData = p => typeof p === 'string' && p.startsWith('data:');

// The migration logic, with its database and uploader passed in so it can be tested
// without a real database or Storage.
//
// Memory/size safety: every query that returns photos returns ONE parcel's photos, never a
// batch — so the size of a response is bounded by one parcel no matter how large your photos
// are. (A batch of 25 parcels of big photos can be a 100 MB+ response, which a database
// pooler may drop.) The first query returns only ids, which are tiny.
async function migrateLands({ prisma, upload, apply, limit = Infinity, log = () => {}, sleep }) {
  const stats = { lands: 0, photos: 0, bytes: 0, failed: 0, failures: [], skipped: [] };
  const retry = fn => withRetry(fn, { log, sleep });

  const ids = (await retry(() => prisma.land.findMany({
    where: { photos: { isEmpty: false } }, select: { id: true }, orderBy: { id: 'asc' },
  }))).map(r => r.id);
  log(`${ids.length} parcel(s) have photos; checking them one at a time…`);

  let done = 0;
  for (const id of ids) {
    if (stats.lands >= limit) { log(`Stopped at --limit=${limit}.`); break; }
    done++;
    let land;
    try {
      land = await retry(() => prisma.land.findUnique({ where: { id }, select: { id: true, orgId: true, farmerId: true, photos: true, updatedAt: true } }));
    } catch (e) { stats.skipped.push({ landId: id, reason: firstLine(e.message) }); log(`  skipped ${id}: could not read it (${firstLine(e.message)})`); continue; }
    if (!land || !land.photos.some(isData)) continue; // already migrated (or gone)

    stats.lands++;
    const prefix = `${land.orgId || 'unassigned'}/${land.farmerId}`;
    const next = [];
    for (let i = 0; i < land.photos.length; i++) {
      const value = land.photos[i];
      if (!isData(value)) { next.push(value); continue; }
      stats.bytes += value.length;
      if (!apply) { next.push(value); stats.photos++; continue; }
      const path = `${prefix}/${randomUUID()}.jpg`;
      const r = await upload(path, value);
      if (!r.ok) { stats.failed++; stats.failures.push({ landId: land.id, index: i, reason: r.error }); next.push(value); continue; }
      next.push(path); stats.photos++;
    }
    if (apply) {
      try {
        // Only write if nobody edited this parcel since we read it (updatedAt unchanged).
        const res = await retry(() => prisma.land.updateMany({ where: { id: land.id, ...(land.updatedAt ? { updatedAt: land.updatedAt } : {}) }, data: { photos: next } }));
        if (res.count === 0) { stats.skipped.push({ landId: land.id, reason: 'was edited while migrating — re-run to pick it up' }); log(`  skipped ${land.id}: edited while migrating`); continue; }
      } catch (e) { stats.skipped.push({ landId: land.id, reason: firstLine(e.message) }); log(`  skipped ${land.id}: could not save it (${firstLine(e.message)})`); continue; }
    }
    log(`  parcel ${stats.lands} done (${done}/${ids.length} checked, ${stats.photos} photo(s) so far)`);
  }
  return stats;
}

const mb = n => (n / 1048576).toFixed(1) + ' MB';
function die(msg) { console.error('\n✗ ' + msg + '\n'); process.exit(1); }

async function main() {
  const apply = process.argv.includes('--apply');
  const fileEnv = {};
  for (const f of ['.env', '.env.local']) { try { Object.assign(fileEnv, parseEnvFile(fs.readFileSync(path.join(process.cwd(), f), 'utf8'))); } catch {} }
  const db = resolveDatabaseUrl(process.env, fileEnv);
  if (db.error) die(db.error);
  process.env.DATABASE_URL = db.url;
  if (db.replacedBad) console.log('Note: the DATABASE_URL you typed was not a database address — using the one from your .env file instead.');
  try { const u = new URL(db.url); console.log(`Database: ${u.hostname}:${u.port || '5432'}${u.pathname}  (from ${db.source})\n`); } catch {}
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  // ── Dry run: measure with a tiny query — NO photo data is transferred. ──
  if (!apply) {
    try {
      const [r] = await prisma.$queryRawUnsafe(`
        SELECT count(*)::int AS lands,
               coalesce(sum(cardinality(photos)), 0)::int AS photos,
               coalesce(sum(octet_length(array_to_string(photos, ''))), 0)::bigint AS bytes
        FROM lands WHERE array_to_string(photos, '') LIKE '%data:%'`);
      console.log(`DRY RUN — ${r.lands} parcel(s) hold ${r.photos} photo(s) as base64, about ${mb(Number(r.bytes))}.`);
      console.log(`\nRunning with --apply will read that much out of the database ONCE (about ${mb(Number(r.bytes))} of egress),`);
      console.log('then upload it to Storage (uploads are free). Make sure this fits in what is left of your monthly quota.');
    } catch (e) { console.log('Could not measure the size automatically: ' + firstLine(e.message) + '\nNothing was changed.'); }
    console.log('\nNothing was changed. Tip: try  --apply --limit=1  first to migrate a single parcel, check it in the app, then run the full migration.');
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
  const limit = Number((process.argv.find(a => a.startsWith('--limit=')) || '').slice(8)) || Infinity;
  if (limit !== Infinity) console.log(`Trial run: migrating at most ${limit} parcel(s).`);
  const stats = await migrateLands({ prisma, upload, apply: true, limit, log: console.log });
  console.log(`\nDone. ${stats.photos} photo(s) moved from ${stats.lands} parcel(s) (${mb(stats.bytes)} read). Failed: ${stats.failed}.`);
  for (const f of stats.failures) console.log(`  FAILED  land ${f.landId}, photo #${f.index}: ${f.reason}  (original kept)`);
  for (const k of stats.skipped) console.log(`  SKIPPED land ${k.landId}: ${k.reason}`);
  if (stats.skipped.length) console.log('\nRe-run the same command to retry the skipped parcels.');
  if (stats.failed) console.log('\nRe-run the same command to retry only the failed ones.');
  await prisma.$disconnect();
}

module.exports = { migrateLands, parseEnvFile, resolveDatabaseUrl, isPostgresUrl, withRetry };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
