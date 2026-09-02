export const runtime = 'nodejs';
// src/app/api/admin/farmers/[id]/assign-officer/route.ts
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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const { officerId } = await req.json(); // null/omitted to unassign

    const farmer = await prisma.farmer.findFirst({ where: { id: params.id, orgId } });
    if (!farmer) return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });

    if (officerId) {
      const officer = await prisma.fieldOfficer.findFirst({ where: { id: officerId, orgId } });
      if (!officer) return NextResponse.json({ error: 'Field officer not found in this organisation' }, { status: 404 });
      if (!officer.active) return NextResponse.json({ error: 'This field officer is deactivated' }, { status: 400 });
    }

    const updated = await prisma.farmer.update({
      where: { id: params.id },
      data: { assignedOfficerId: officerId || null },
      select: { id: true, assignedOfficerId: true, assignedOfficer: { select: { name: true } } },
    });

    await prisma.auditLog.create({
      data: {
        farmerId: params.id, actorRole: 'ADMIN', action: officerId ? 'OFFICER_ASSIGNED' : 'OFFICER_UNASSIGNED',
        details: { officerId: officerId || null, officerName: updated.assignedOfficer?.name },
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, farmer: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
