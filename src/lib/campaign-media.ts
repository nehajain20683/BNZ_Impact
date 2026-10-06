// src/lib/campaign-media.ts
// Campaign images live in the "campaign-media" Storage bucket (the database holds only their paths).
// These helpers are shared by the admin and public campaign routes so the conversion rules exist once.
import { resolveStoredImage, resolveStoredImages, toStoredImage } from '@/lib/supabase-storage';

const BUCKET = 'campaign-media' as const;

// A campaign (cover + gallery) with its images as servable URLs.
export function campaignWithUrls<T extends { imageUrl?: any; galleryImages?: any }>(c: T): T {
  if (!c) return c;
  const out: any = { ...c };
  if ('imageUrl' in out) out.imageUrl = resolveStoredImage(BUCKET, out.imageUrl);
  if ('galleryImages' in out) out.galleryImages = resolveStoredImages(BUCKET, out.galleryImages);
  return out;
}

// A list card (cover only) with its image as a servable URL.
export function cardWithUrl<T extends { imageUrl?: any }>(c: T): T {
  if (!c) return c;
  return { ...c, imageUrl: resolveStoredImage(BUCKET, c.imageUrl) };
}

// What to SAVE for the image fields an admin form sent. Only the keys present in `input` are
// returned, so a save that doesn't touch images leaves them alone.
export async function storeCampaignImages(
  orgId: string | null | undefined, slug: string, input: { imageUrl?: any; galleryImages?: any },
): Promise<{ imageUrl?: string | null; galleryImages?: string[] }> {
  const prefix = `${orgId || 'unassigned'}/${slug}`;
  const out: { imageUrl?: string | null; galleryImages?: string[] } = {};
  if ('imageUrl' in input) out.imageUrl = await toStoredImage(BUCKET, prefix, input.imageUrl);
  if ('galleryImages' in input) {
    const list = Array.isArray(input.galleryImages) ? input.galleryImages : [];
    const stored: string[] = [];
    for (const g of list) { const v = await toStoredImage(BUCKET, prefix, g); if (v) stored.push(v); }
    out.galleryImages = stored;
  }
  return out;
}
