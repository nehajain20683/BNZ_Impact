export const runtime = 'nodejs';
// src/app/api/admin/signatories/[id]/route.ts
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
    const existing = await prisma.orgSignatory.findFirst({ where: { id: params.id, orgId } });
    if (!existing) return NextResponse.json({ error: 'Signatory not found' }, { status: 404 });

    const body = await req.json();
    const data: any = {};
    for (const f of ['name', 'designation', 'signatureImage']) if (body[f] !== undefined) data[f] = body[f];

    if (body.isPrimary === true) {
      await prisma.orgSignatory.updateMany({ where: { orgId, isPrimary: true }, data: { isPrimary: false } });
      data.isPrimary = true;
    } else if (body.isPrimary === false) {
      data.isPrimary = false;
    }

    const signatory = await prisma.orgSignatory.update({ where: { id: params.id }, data });
    return NextResponse.json({ success: true, signatory });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const existing = await prisma.orgSignatory.findFirst({ where: { id: params.id, orgId } });
    if (!existing) return NextResponse.json({ error: 'Signatory not found' }, { status: 404 });

    await prisma.orgSignatory.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
