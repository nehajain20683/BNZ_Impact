export const runtime = 'nodejs';
// src/app/api/admin/monitoring-visits/[id]/route.ts
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

// PATCH — action: VERIFY | PUBLISH | SEND_BACK
// Only PUBLISH makes a visit donor-visible — matches "Only verified
// monitoring becomes donor-visible" and keeps raw field data internal
// until an admin explicitly decides to publish it.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireAdmin();
    const orgId = await getActiveOrgId();
    const body  = await req.json();
    const { action } = body;

    if (!['VERIFY', 'PUBLISH', 'SEND_BACK'].includes(action))
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    const visit = await (prisma as any).monitoringVisit.findFirst({
      where: { id: params.id, site: { orgId } },
    });
    if (!visit) return NextResponse.json({ error: 'Monitoring visit not found' }, { status: 404 });

    const data: any = { status: action === 'VERIFY' ? 'VERIFIED' : action === 'PUBLISH' ? 'PUBLISHED' : 'SENT_BACK' };
    if (action === 'PUBLISH') {
      data.donorVisible = true;
      data.publishedAt = new Date();
      data.publishedById = actor.id;
    }

    const updated = await (prisma as any).monitoringVisit.update({ where: { id: params.id }, data });
    return NextResponse.json({ success: true, visit: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
