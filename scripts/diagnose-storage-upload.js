// scripts/diagnose-storage-upload.js
// Uploads one tiny test file to confirm bucket access and credentials are
// actually correct, printing the REAL error message immediately instead
// of waiting for a full backfill run to finish. Run this first whenever
// every record in the backfill is failing — it isolates whether the
// problem is your Storage setup (bucket/credentials) versus something
// specific to the image data itself.
//
//   SUPABASE_URL="https://xxx.supabase.co" \
//   SUPABASE_SERVICE_ROLE_KEY="..." node scripts/diagnose-storage-upload.js

const { createClient } = require('@supabase/supabase-js');

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('SUPABASE_URL set:', !!url, url ? `(${url})` : '(MISSING)');
  console.log('SUPABASE_SERVICE_ROLE_KEY set:', !!key, key ? `(${key.slice(0, 8)}...${key.slice(-4)}, length ${key.length})` : '(MISSING)');

  if (!url || !key) {
    console.error('\nStop here — one or both env vars are missing in this shell. Set them and re-run.');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  console.log('\n--- Listing buckets ---');
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('Could not list buckets:', listError.message);
    console.error('This usually means the SERVICE ROLE KEY is wrong or missing permissions — double-check you copied the "service_role" key, not "anon".');
    process.exit(1);
  }
  console.log('Buckets found:', buckets.map(b => `${b.name} (public: ${b.public})`).join(', ') || '(none at all)');

  const hasTreePhotos = buckets.some(b => b.name === 'tree-photos');
  if (!hasTreePhotos) {
    console.error('\n"tree-photos" bucket does NOT exist. This is almost certainly the whole problem.');
    console.error('Go to Supabase Dashboard → Storage → New bucket → name it exactly "tree-photos" → mark it Public.');
    process.exit(1);
  }

  console.log('\n--- Attempting a real test upload ---');
  const testBuffer = Buffer.from('diagnostic-test-file', 'utf-8');
  const testPath = `_diagnostic/test-${Date.now()}.txt`;
  const { error: uploadError } = await supabase.storage.from('tree-photos').upload(testPath, testBuffer, { contentType: 'text/plain' });

  if (uploadError) {
    console.error('Upload FAILED. Real error:', uploadError.message);
    console.error('\nFull error object, for anything the message alone doesn\'t explain:');
    console.error(JSON.stringify(uploadError, null, 2));
    process.exit(1);
  }

  console.log('Upload SUCCEEDED — Storage access is working correctly.');
  const { data: urlData } = supabase.storage.from('tree-photos').getPublicUrl(testPath);
  console.log('Test file public URL:', urlData.publicUrl);

  // Clean up the test file — no reason to leave it there.
  await supabase.storage.from('tree-photos').remove([testPath]);
  console.log('\nStorage setup is correct. If the backfill is still failing, the issue is likely with the image data format itself, not credentials/bucket access — share one of the printed failure reasons from the backfill\'s final summary.');
}

main().catch(e => { console.error('Unexpected error:', e); process.exit(1); });
