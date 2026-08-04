export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN','SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const orgId  = await getActiveOrgId();
    const params = new URL(req.url).searchParams;
    const page   = parseInt(params.get('page') || '1');
    const limit  = parseInt(params.get('limit') || '50');

    // Get user IDs belonging to this org
    const orgUsers = await prisma.user.findMany({
      where:  { orgId },
      select: { id: true },
    });
    const userIds = orgUsers.map(u => u.id);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where:   { actorId: { in: userIds } },
        orderBy: { createdAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
      prisma.auditLog.count({
        where: { actorId: { in: userIds } },
      }),
    ]);

    return NextResponse.json({ logs, total, page, limit });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
