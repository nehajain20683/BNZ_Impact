// src/lib/supabase-storage.ts
// Phase 2 of the egress reduction plan — actual object storage, replacing
// base64-in-Postgres for images. Deliberately follows the "store the
// object path, not the full URL" recommendation: every function that
// writes an image record saves a PATH (e.g.
// "tree-photos/org123/tree456/uuid.jpg"), and getPublicUrl() constructs
// the servable URL at read time. If the bucket, CDN, or project ever
// changes, only this one function needs updating — no database records
// need touching.
//
// Requires two env vars this project has not needed before, since
// Storage was never used:
//   SUPABASE_URL              — the project URL (Settings → API)
//   SUPABASE_SERVICE_ROLE_KEY — service role key, NOT the anon key,
//                                since uploads happen server-side and
//                                need to bypass row-level security
//
// These are DIFFERENT from DATABASE_URL (which is the direct Postgres
// connection string Prisma uses) — Storage talks to Supabase's own API,
// not the database connection directly.

import { createClient } from '@supabase/supabase-js';

let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use Storage — see src/lib/supabase-storage.ts for what these are and where to find them.');
  }
  _client = createClient(url, key);
  return _client;
}

export type StorageBucket = 'tree-photos' | 'farmer-photos' | 'land-photos' | 'monitoring-photos' | 'campaign-media';

// Uploads a base64 data URL (the format every image in this app has been
// captured as up to now) to the given bucket/path, returning the path
// actually stored — not a URL. Caller saves this path in the database.
export async function uploadBase64ToStorage(bucket: StorageBucket, path: string, base64DataUrl: string): Promise<string> {
  const match = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Not a valid base64 data URL');
  const [, contentType, base64Data] = match;
  const buffer = Buffer.from(base64Data, 'base64');

  const client = getClient();
  const { error } = await client.storage.from(bucket).upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

// Constructs the public URL for a stored path. Buckets referenced here
// are assumed public (tree evidence, monitoring photos, campaign media —
// already shown on donor-facing and public pages today as base64, so
// making them public objects doesn't change who can see them). For a
// model holding genuinely private data (farmer identity documents, for
// instance) use getSignedUrl below instead when that migration happens.
export function getPublicUrl(bucket: StorageBucket, path: string | null | undefined): string | null {
  if (!path) return null;
  // Already a full URL or a base64 string that hasn't been migrated yet —
  // return as-is so old and new records both keep working during the
  // transition, rather than requiring every record to migrate atomically.
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  const client = getClient();
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Time-limited signed URL for buckets that should NOT be public — use
// this instead of getPublicUrl for anything genuinely sensitive when
// that model's migration happens (farmer documents, for instance).
export async function getSignedUrl(bucket: StorageBucket, path: string, expiresInSeconds = 3600): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  const client = getClient();
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

export async function deleteFromStorage(bucket: StorageBucket, path: string): Promise<void> {
  if (!path || path.startsWith('http') || path.startsWith('data:')) return;
  const client = getClient();
  await client.storage.from(bucket).remove([path]);
}
