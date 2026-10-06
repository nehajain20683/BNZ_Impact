export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DOCUMENT_LITE, FARMER_LITE } from '@/lib/lite-select';

// GET — list farmer's documents
export async function GET(req: Request) {
  const farmerId = new URL(req.url).searchParams.get('farmerId');
  if (!farmerId) return NextResponse.json({ error: 'farmerId required' }, { status: 400 });

  const rows = await prisma.farmerDocument.findMany({
    where: { farmerId }, select: DOCUMENT_LITE, orderBy: { createdAt: 'desc' },
  });
  // fileUrl is now a URL to the on-demand file endpoint, not the file's bytes —
  // existing <a href={doc.fileUrl}> / <img src={doc.fileUrl}> keep working.
  const documents = rows.map((r: any) => ({ ...r, fileUrl: `/api/farmer/documents/${r.id}/file?farmerId=${encodeURIComponent(farmerId)}` }));
  return NextResponse.json({ documents });
}

// POST — save document record (after upload to storage)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { farmerId, docType, fileUrl, fileName, fileSize, landId } = body;

    if (!farmerId || !docType || !fileUrl)
      return NextResponse.json({ error: 'farmerId, docType and fileUrl are required' }, { status: 400 });

    // If this is a land-specific document, make sure the land actually
    // belongs to this farmer and isn't already approved/locked.
    if (landId) {
      const land = await prisma.land.findUnique({ where: { id: landId }, select: { id: true, farmerId: true, verified: true } });
      if (!land || land.farmerId !== farmerId)
        return NextResponse.json({ error: 'Land parcel not found' }, { status: 404 });
      if (land.verified)
        return NextResponse.json({ error: 'This land has been approved and its documents are locked. Contact your administrator for changes.' }, { status: 400 });
    }

    const doc = await prisma.farmerDocument.create({
      data: {
        farmerId,
        landId:   landId || undefined,
        docType:  docType as any,
        fileUrl,
        fileName: fileName || undefined,
        fileSize: fileSize || undefined,
        status:   'PENDING',
      },
    });

    // Update farmer status to DOCUMENTS_PENDING if not already further along
    const farmer = await prisma.farmer.findUnique({ where: { id: farmerId }, select: FARMER_LITE });
    if (farmer && farmer.status === 'REGISTERED') {
      await prisma.farmer.update({
        where: { id: farmerId },
        data:  { status: 'DOCUMENTS_PENDING' },
      });
    }

    await prisma.auditLog.create({
      data: { farmerId, actorRole: 'FARMER', action: 'DOCUMENT_UPLOADED', details: { docType, fileName } }
    }).catch(() => {});

    return NextResponse.json({ success: true, documentId: doc.id });
  } catch (e: any) {
    console.error('Document upload error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — remove a document
export async function DELETE(req: Request) {
  try {
    const { documentId, farmerId } = await req.json();
    const doc = await prisma.farmerDocument.findUnique({ where: { id: documentId }, select: { landId: true } });
    if (doc?.landId) {
      const land = await prisma.land.findUnique({ where: { id: doc.landId }, select: { verified: true } });
      if (land?.verified)
        return NextResponse.json({ error: 'This land has been approved and its documents are locked.' }, { status: 400 });
    }
    await prisma.farmerDocument.deleteMany({
      where: { id: documentId, farmerId }, // farmerId check for security
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
