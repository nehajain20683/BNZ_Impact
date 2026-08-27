export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN','SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const orgId  = await getActiveOrgId();
    const params = new URL(req.url).searchParams;
    const search = params.get('search') || '';
    const status = params.get('status') || '';

    const where: any = { orgId };
    if (search) where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { mobile:   { contains: search } },
      { farmerIdGenerated: { contains: search, mode: 'insensitive' } },
    ];
    if (status) where.status = status;

    const farmers = await prisma.farmer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true, fullName: true, mobile: true, village: true,
        district: true, state: true, status: true,
        farmerIdGenerated: true, gisId: true,
        registrationStep: true, createdAt: true,
        lands: { select: { id: true, areaAcres: true, surveyGutNumber: true } },
      },
    });

    return NextResponse.json({ farmers });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}

// PATCH — admin manually sets a farmer's status. This was previously
// missing entirely: the admin UI's status dropdown called PATCH here, got
// a 405 every time (no handler existed), and the frontend never checked
// the response — so it always showed "Status updated" while nothing
// actually persisted.
export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const body  = await req.json();
    const { farmerId, status } = body;

    if (!farmerId || !status)
      return NextResponse.json({ error: 'farmerId and status are required' }, { status: 400 });

    const validStatuses = ['REGISTERED','DOCUMENTS_PENDING','VERIFIED_LAND_OWNER','SUSPENDED'];
    if (!validStatuses.includes(status))
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });

    const existing = await prisma.farmer.findFirst({ where: { id: farmerId, orgId } });
    if (!existing) return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });

    const farmer = await prisma.farmer.update({
      where: { id: farmerId },
      data:  { status: status as any },
    });

    await prisma.auditLog.create({
      data: { farmerId, actorRole: 'ADMIN', action: 'STATUS_CHANGED', details: { from: existing.status, to: status } },
    }).catch(() => {});

    return NextResponse.json({ success: true, farmer });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}

// DEBUG - remove after fix
export async function POST(req: Request) {
  const orgId = await getActiveOrgId().catch(() => 'error');
  const count = await prisma.farmer.count({ where: { orgId } }).catch(() => -1);
  return NextResponse.json({ debug: true, orgId, farmerCount: count });
}
