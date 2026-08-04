export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId     = await getActiveOrgId();
    const campaigns = await prisma.campaign.findMany({
      where:   { orgId },
      orderBy: { createdAt: 'asc' },
      select:  { id: true, name: true, slug: true, treePrice: true, active: true },
    });
    return NextResponse.json({ campaigns });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
