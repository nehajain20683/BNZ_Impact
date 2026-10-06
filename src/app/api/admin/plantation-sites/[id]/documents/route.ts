export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { guardSite, siteDocumentOfSite } from '@/lib/admin-guard';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const adminScope = await guardSite(params.id);
  if (adminScope instanceof Response) return adminScope;
  const docs = await prisma.siteDocument.findMany({
    where: { siteId: params.id },
    orderBy: { uploadedAt: 'desc' },
  });
  return NextResponse.json({ documents: docs });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const adminScope = await guardSite(params.id);
  if (adminScope instanceof Response) return adminScope;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { folder, fileName, fileUrl, fileSize } = await req.json();
    if (!folder || !fileName || !fileUrl)
      return NextResponse.json({ error: 'folder, fileName, fileUrl required' }, { status: 400 });

    const existing = await prisma.siteDocument.findFirst({
      where: { siteId: params.id, folder, fileName }, orderBy: { version: 'desc' },
    });

    const doc = await prisma.siteDocument.create({
      data: {
        siteId: params.id, folder, fileName, fileUrl,
        fileSize: fileSize || null,
        version: existing ? existing.version + 1 : 1,
        uploadedById: (session.user as any).id,
      },
    });

    await prisma.timelineEvent.create({
      data: { siteId: params.id, eventType: 'DOCUMENT_UPLOADED',
              title: `Document uploaded: ${fileName}`,
              description: `Folder: ${folder}`, createdById: (session.user as any).id }
    }).catch(() => {});

    return NextResponse.json({ success: true, document: doc });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const adminScope = await guardSite(params.id);
  if (adminScope instanceof Response) return adminScope;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { documentId } = await req.json();
  // Only a document that belongs to THIS (already authorised) site may be deleted —
  // this used to delete any document in any org, by ID alone.
  if (!documentId || !(await siteDocumentOfSite(documentId, params.id)))
    return NextResponse.json({ error: 'Document not found for this site' }, { status: 404 });
  await prisma.siteDocument.delete({ where: { id: documentId } });
  return NextResponse.json({ success: true });
}
