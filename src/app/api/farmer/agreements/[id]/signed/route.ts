export const runtime = 'nodejs';
// The farmer's own uploaded signed copy, served on demand (the agreements list
// returns this URL instead of the file).
import prisma from '@/lib/prisma';
import { dataUrlToResponse } from '@/lib/blob-response';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const farmerId = new URL(req.url).searchParams.get('farmerId');
  if (!farmerId) return new Response('farmerId required', { status: 400 });
  const row = await prisma.farmerAgreement.findFirst({
    where: { id: params.id, farmerId }, select: { signedPdfUrl: true, title: true },
  });
  if (!row?.signedPdfUrl) return new Response('Not found', { status: 404 });
  return dataUrlToResponse(row.signedPdfUrl, { filename: `${row.title || 'signed-copy'}`, maxAgeSeconds: 300 });
}
