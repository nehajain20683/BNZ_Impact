export const runtime = 'nodejs';
// src/app/api/admin/signatories/route.ts
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

export async function GET() {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const signatories = await prisma.orgSignatory.findMany({ where: { orgId }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] });
    return NextResponse.json({ signatories });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const { name, designation, signatureImage, isPrimary } = await req.json();

    if (!name || !designation || !signatureImage)
      return NextResponse.json({ error: 'name, designation and signatureImage are required' }, { status: 400 });

    // Only one primary at a time — setting a new primary clears the old one,
    // rather than silently leaving two "primary" signatories where document
    // generation would have to guess which one wins.
    if (isPrimary) {
      await prisma.orgSignatory.updateMany({ where: { orgId, isPrimary: true }, data: { isPrimary: false } });
    }

    const signatory = await prisma.orgSignatory.create({
      data: { orgId, name, designation, signatureImage, isPrimary: !!isPrimary },
    });

    return NextResponse.json({ success: true, signatory });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
