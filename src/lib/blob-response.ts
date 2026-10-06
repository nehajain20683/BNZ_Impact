// src/lib/blob-response.ts
// Serves a stored file (kept as a base64 data URL) as a real HTTP file.
// This is what lets list endpoints return a small URL instead of the file:
// the browser fetches the bytes only when someone actually opens them, and can
// cache them, instead of every list request re-downloading every file.
//
// Only images and PDFs are ever served inline. Anything else (HTML, SVG, KML…)
// is forced to download as an opaque attachment — a stored file must never be
// able to run as a page on our origin.
const INLINE_OK = /^(image\/(png|jpe?g|webp|gif|heic|heif)|application\/pdf)$/i;
const safeName = (n?: string | null) => (n || 'file').replace(/[^\w.\- ]+/g, '_').slice(0, 80) || 'file';

export function dataUrlToResponse(
  stored: string | null | undefined,
  opts: { filename?: string | null; maxAgeSeconds?: number; cacheControl?: string } = {},
): Response {
  if (!stored) return new Response('Not found', { status: 404 });
  if (/^https?:\/\//i.test(stored)) return Response.redirect(stored, 302); // already a hosted file
  const m = /^data:([^;,]+)(?:;[^,]*)?;base64,([\s\S]*)$/.exec(stored);
  if (!m) return new Response('Unsupported file', { status: 415 });
  const type = m[1].toLowerCase();
  const bytes = Buffer.from(m[2], 'base64');
  const inline = INLINE_OK.test(type);
  return new Response(bytes as any, {
    headers: {
      'Content-Type': inline ? type : 'application/octet-stream',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${safeName(opts.filename)}"`,
      'Content-Length': String(bytes.length),
      'Cache-Control': opts.cacheControl ?? `private, max-age=${opts.maxAgeSeconds ?? 3600}`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
