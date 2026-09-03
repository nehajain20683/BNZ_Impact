export const runtime = 'nodejs';
// src/app/api/admin/lands/[id]/parse-kml/route.ts
// Works retroactively on any KML already uploaded and verified through the
// normal document flow — the raw file has been sitting in FarmerDocument
// this whole time, nothing has ever read into it until now.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';
import { parseKmlToGeoJson, decodeKmlDataUri } from '@/lib/kml-parser';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const body = await req.json().catch(() => ({}));

    const land = await prisma.land.findFirst({
      where: { id: params.id, farmer: { orgId } },
      include: {
        documents: {
          where: { docType: 'OTHER' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!land) return NextResponse.json({ error: 'Land not found in this organisation' }, { status: 404 });

    // A specific document can be requested (the admin picked one from a
    // list of several OTHER-type uploads); otherwise take the most recent
    // upload that actually looks like a KML/KMZ file by its name.
    const kmlDoc = body.documentId
      ? land.documents.find(d => d.id === body.documentId)
      : land.documents.find(d => /\.(kml|kmz)$/i.test(d.fileName || ''));

    if (!kmlDoc)
      return NextResponse.json({ error: 'No KML/KMZ file found among this land\'s uploaded documents.' }, { status: 404 });

    if (/\.kmz$/i.test(kmlDoc.fileName || ''))
      return NextResponse.json({ error: 'This is a KMZ (zipped) file — only plain .kml is supported right now, since unzipping needs a library this environment can\'t install. Re-export as .kml from Google Earth and re-upload.' }, { status: 400 });

    const kmlText = decodeKmlDataUri(kmlDoc.fileUrl);
    const { polygon, error } = parseKmlToGeoJson(kmlText);

    if (!polygon)
      return NextResponse.json({ error: error || 'Could not extract a boundary from this file.' }, { status: 422 });

    const updated = await prisma.land.update({
      where: { id: params.id },
      data: { polygonGeoJson: polygon as any },
    });

    return NextResponse.json({ success: true, polygonGeoJson: updated.polygonGeoJson, pointCount: polygon.coordinates[0].length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
