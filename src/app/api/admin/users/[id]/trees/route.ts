export const runtime = 'nodejs';
// src/app/api/admin/users/[id]/trees/route.ts
// Mirrors the donor dashboard's own trees API (search/filter/pagination) so
// admin gets the same capability when looking at one specific donor's
// trees — plus what only admin needs to see: the linked farmer's name and
// a thumbnail of the latest Field Officer photo, tracing tree -> donor ->
// farmer -> evidence in one place.
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

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();

    const user = await prisma.user.findFirst({ where: { id: params.id, orgId }, select: { id: true } });
    if (!user) return NextResponse.json({ error: 'User not found in this organisation' }, { status: 404 });

    const params_  = new URL(req.url).searchParams;
    const page     = parseInt(params_.get('page') || '1');
    const pageSize = Math.min(parseInt(params_.get('pageSize') || '24'), 100);
    const status   = params_.get('status') || undefined;
    const linked   = params_.get('linked') || undefined; // 'true' | 'false'
    const siteId   = params_.get('siteId') || undefined;
    const search   = params_.get('search') || undefined;
    const sort     = params_.get('sort') === 'oldest' ? 'asc' : 'desc';

    const where: any = { donation: { userId: params.id, paymentStatus: 'COMPLETED' } };
    if (status) where.status = status;
    if (siteId) where.siteId = siteId;
    if (linked === 'true')  where.assignmentId = { not: null };
    if (linked === 'false') where.assignmentId = null;
    if (search) where.treeTagId = { contains: search, mode: 'insensitive' };

    const [trees, total] = await Promise.all([
      prisma.tree.findMany({
        where,
        select: {
          id: true, treeTagId: true, species: true, status: true, plantedDate: true,
          plantationSite: { select: { id: true, siteName: true, district: true, state: true } },
          assignment: { select: { farmer: { select: { fullName: true } } } },
          images: { select: { imageUrl: true, capturedAt: true }, orderBy: { capturedAt: 'desc' }, take: 1 },
        },
        orderBy: { plantedDate: sort },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.tree.count({ where }),
    ]);

    return NextResponse.json({
      trees: trees.map(t => ({
        id: t.id, treeTagId: t.treeTagId, species: t.species, status: t.status, plantedDate: t.plantedDate,
        plantationSite: t.plantationSite,
        farmerName: t.assignment?.farmer?.fullName || null,
        latestPhoto: t.images[0]?.imageUrl || null,
        photoCapturedAt: t.images[0]?.capturedAt || null,
      })),
      total, page, totalPages: Math.ceil(total / pageSize) || 1,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
