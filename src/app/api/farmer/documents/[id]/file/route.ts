export const runtime = 'nodejs';
// Serves one uploaded document on demand. The documents LIST now returns this
// URL instead of the file itself, so opening the Documents page no longer
// downloads every uploaded document from the database.
import prisma from '@/lib/prisma';
import { dataUrlToResponse } from '@/lib/blob-response';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const farmerId = new URL(req.url).searchParams.get('farmerId');
  if (!farmerId) return new Response('farmerId required', { status: 400 });
  const doc = await prisma.farmerDocument.findFirst({
    where: { id: params.id, farmerId }, select: { fileUrl: true, fileName: true },
  });
  if (!doc) return new Response('Not found', { status: 404 });
  return dataUrlToResponse(doc.fileUrl, { filename: doc.fileName });
}
