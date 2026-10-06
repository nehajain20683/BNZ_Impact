export const runtime = 'nodejs';
// A farmer's profile photo as a real, cacheable image. API responses used to carry the photo as
// base64 text inside every profile / public-page call (~250 KB each time); they now carry this URL
// (versioned with ?v=<updatedAt>, so a new photo gets a new URL) and the browser — or, for publicly
// visible farmers, the CDN — keeps the image instead of re-reading it from the database.
import prisma from '@/lib/prisma';
import { dataUrlToResponse } from '@/lib/blob-response';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const f = await prisma.farmer.findUnique({ where: { id: params.id }, select: { photo: true, publiclyVisible: true, status: true } });
  if (!f?.photo) return new Response('Not found', { status: 404 });
  // The same people who could already see this photo on a public page may be served from the shared
  // CDN cache; everyone else gets a private (browser-only) cache.
  const shared = f.publiclyVisible && f.status === 'VERIFIED_LAND_OWNER';
  return dataUrlToResponse(f.photo, {
    filename: 'photo',
    cacheControl: shared ? 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400' : 'private, max-age=86400',
  });
}
