export const runtime = 'nodejs';
// src/app/api/admin/sites/[id]/carbon-credits/[creditId]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';
import { canTransitionCredit, nextValidCreditStatuses } from '@/lib/registry-workflow';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

export async function PATCH(req: Request, { params }: { params: { id: string; creditId: string } }) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const body = await req.json();

    const credit = await (prisma as any).carbonCredit.findFirst({ where: { id: params.creditId, siteId: params.id, orgId } });
    if (!credit) return NextResponse.json({ error: 'Credit not found in this organisation' }, { status: 404 });

    const newStatus = body.status;
    if (!canTransitionCredit(credit.status, newStatus))
      return NextResponse.json({
        error: `Cannot move from ${credit.status} to ${newStatus}. Valid next steps: ${nextValidCreditStatuses(credit.status).join(', ') || 'none — this is a terminal state'}`,
      }, { status: 400 });

    const data: any = { status: newStatus };
    if (newStatus === 'ISSUED') data.issuedAt = new Date();
    if (newStatus === 'SOLD') {
      data.soldAt = new Date();
      if (body.creditsSold) data.creditsSold = parseFloat(body.creditsSold);
      if (body.revenueShared) data.revenueShared = parseFloat(body.revenueShared);
    }
    if (newStatus === 'TRANSFERRED' && body.creditsTransferred) data.creditsTransferred = parseFloat(body.creditsTransferred);
    if (newStatus === 'RETIRED') {
      data.retiredAt = new Date();
      data.retirementReason = body.retirementReason || null;
      if (body.creditsRetired) data.creditsRetired = parseFloat(body.creditsRetired);
    }

    const updated = await (prisma as any).carbonCredit.update({ where: { id: credit.id }, data });
    return NextResponse.json({ success: true, credit: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
