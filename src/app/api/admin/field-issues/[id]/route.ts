export const runtime = 'nodejs';
// src/app/api/admin/field-issues/[id]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const body = await req.json();
    const { action, resolutionNotes } = body; // action: ACKNOWLEDGE | RESOLVE | REOPEN

    const issue = await prisma.fieldIssue.findFirst({ where: { id: params.id, site: { orgId } } });
    if (!issue) return NextResponse.json({ error: 'Issue not found in this organisation' }, { status: 404 });

    const statusMap: Record<string, string> = { ACKNOWLEDGE: 'ACKNOWLEDGED', RESOLVE: 'RESOLVED', REOPEN: 'OPEN' };
    const nextStatus = statusMap[action];
    if (!nextStatus) return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

    if (action === 'RESOLVE' && !resolutionNotes)
      return NextResponse.json({ error: 'A resolution note is required — what was actually done about this issue.' }, { status: 400 });

    const updated = await prisma.fieldIssue.update({
      where: { id: params.id },
      data: {
        status: nextStatus,
        ...(action === 'RESOLVE' ? { resolutionNotes, resolvedAt: new Date() } : {}),
        ...(action === 'REOPEN' ? { resolutionNotes: null, resolvedAt: null } : {}),
      },
    });

    return NextResponse.json({ success: true, issue: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
