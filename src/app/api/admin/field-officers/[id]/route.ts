export const runtime = 'nodejs';
// src/app/api/admin/field-officers/[id]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

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
    const body = await req.json();

    const existing = await prisma.fieldOfficer.findFirst({ where: { id: params.id, orgId } });
    if (!existing) return NextResponse.json({ error: 'Field officer not found' }, { status: 404 });

    const data: any = {};
    for (const k of ['name', 'employeeId', 'designation', 'district', 'state']) {
      if (body[k] !== undefined) data[k] = body[k] || null;
    }
    if (body.active !== undefined) data.active = !!body.active;
    if (body.password) {
      if (body.password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      data.password = await bcrypt.hash(body.password, 10);
    }

    const officer = await prisma.fieldOfficer.update({
      where: { id: params.id }, data,
      select: { id: true, name: true, active: true },
    });
    return NextResponse.json({ success: true, officer });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
