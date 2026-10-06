export const runtime = 'nodejs';
// src/app/api/admin/sites/[id]/pdd/[pddId]/route.ts
// PATCH edits a PDD's content fields — only while it's still DRAFT,
// matching real registry practice where a submitted document is locked
// from casual editing. The status transition itself is a separate
// action (below), since "edit content" and "advance workflow state" are
// different operations with different validation rules.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';
import { canTransition, nextValidStatuses, appendStatusHistory } from '@/lib/registry-workflow';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

const EDITABLE_FIELDS = [
  'registryType', 'baselineScenario', 'additionalityJustification', 'permanencePlan',
  'projectDescription', 'leakageAssessment', 'stakeholderConsultation', 'monitoringMethodology',
];

export async function PATCH(req: Request, { params }: { params: { id: string; pddId: string } }) {
  try {
    const actor = await requireAdmin();
    const orgId = await getActiveOrgId();
    const body = await req.json();

    const pdd = await prisma.projectDesignDocument.findFirst({ where: { id: params.pddId, siteId: params.id, orgId } });
    if (!pdd) return NextResponse.json({ error: 'PDD not found in this organisation' }, { status: 404 });

    if (body.action === 'transition') {
      const newStatus = body.status;
      if (!canTransition(pdd.status, newStatus))
        return NextResponse.json({ error: `Cannot move from ${pdd.status} to ${newStatus}. Valid next steps: ${nextValidStatuses(pdd.status).join(', ') || 'none — this is a terminal state'}` }, { status: 400 });

      const updated = await prisma.projectDesignDocument.update({
        where: { id: pdd.id },
        data: {
          status: newStatus,
          submittedAt: newStatus === 'SUBMITTED' ? new Date() : pdd.submittedAt,
          statusHistory: appendStatusHistory(pdd.statusHistory, {
            status: newStatus, changedAt: new Date().toISOString(),
            changedBy: actor.name || actor.email, note: body.note || undefined,
          }) as any,
        },
      });
      return NextResponse.json({ success: true, pdd: updated });
    }

    // Content edit — only while still a draft.
    if (pdd.status !== 'DRAFT')
      return NextResponse.json({ error: `This PDD is ${pdd.status} and can no longer be edited directly — create a new version instead.` }, { status: 400 });

    const data: any = {};
    for (const field of EDITABLE_FIELDS) if (field in body) data[field] = body[field] || null;
    if (body.creditingPeriodStart) data.creditingPeriodStart = new Date(body.creditingPeriodStart);
    if (body.creditingPeriodEnd) data.creditingPeriodEnd = new Date(body.creditingPeriodEnd);

    const updated = await prisma.projectDesignDocument.update({ where: { id: pdd.id }, data });
    return NextResponse.json({ success: true, pdd: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
