export const runtime = 'nodejs';
// src/app/api/admin/documents/queue/route.ts
// The cross-farmer document queue that didn't exist anywhere before —
// identity docs (Aadhaar/PAN/cancelled cheque) previously only reviewable
// one farmer at a time, land docs the same. Each record here is annotated
// with whether it's a farmer-level identity doc (landId null) or a
// specific-parcel land doc — a farmer can have several land parcels, each
// with its own independent set of land documents, so grouping only by
// farmer would conflate different parcels' paperwork together.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const params = new URL(req.url).searchParams;
    const status = params.get('status') || 'PENDING';
    const scope  = params.get('scope');  // 'identity' | 'land' | undefined (all)
    const docType = params.get('docType');
    const search  = params.get('search');

    const where: any = { farmer: { orgId } };
    if (status !== 'ALL') where.status = status;
    if (scope === 'identity') where.landId = null;
    if (scope === 'land') where.landId = { not: null };
    if (docType) where.docType = docType;
    if (search) where.farmer = { ...where.farmer, fullName: { contains: search, mode: 'insensitive' } };

    const documents = await prisma.farmerDocument.findMany({
      where,
      include: {
        farmer: { select: { id: true, fullName: true, mobile: true, farmerIdGenerated: true } },
        land: { select: { id: true, surveyGutNumber: true, village: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const counts = await prisma.farmerDocument.groupBy({
      by: ['status'],
      where: { farmer: { orgId } },
      _count: { _all: true },
    });
    const statusCounts: Record<string, number> = {};
    for (const c of counts) statusCounts[c.status] = c._count._all;

    return NextResponse.json({ documents, statusCounts });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
