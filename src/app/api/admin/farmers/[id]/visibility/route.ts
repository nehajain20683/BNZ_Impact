export const runtime = 'nodejs';
// src/app/api/admin/farmers/[id]/visibility/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
      throw new Error('Unauthorized');
    const orgId = await getActiveOrgId();

    const { publiclyVisible } = await req.json();
    const farmer = await prisma.farmer.findFirst({ where: { id: params.id, orgId } });
    if (!farmer) return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });

    const updated = await prisma.farmer.update({
      where: { id: params.id },
      data: { publiclyVisible: !!publiclyVisible },
      select: { id: true, publiclyVisible: true },
    });

    return NextResponse.json({ success: true, farmer: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
