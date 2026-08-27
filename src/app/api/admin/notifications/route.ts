export const runtime = 'nodejs';
// src/app/api/admin/notifications/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = await getActiveOrgId();

    const notifications = await (prisma as any).notification.findMany({
      where: { recipientType: 'ADMIN_ORG', recipientId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await (prisma as any).notification.count({
      where: { recipientType: 'ADMIN_ORG', recipientId: orgId, read: false },
    });
    return NextResponse.json({ notifications, unreadCount });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = await getActiveOrgId();
    const body  = await req.json();
    const { id, markAllRead } = body;

    if (markAllRead) {
      await (prisma as any).notification.updateMany({
        where: { recipientType: 'ADMIN_ORG', recipientId: orgId, read: false },
        data: { read: true },
      });
    } else if (id) {
      await (prisma as any).notification.updateMany({
        where: { id, recipientType: 'ADMIN_ORG', recipientId: orgId },
        data: { read: true },
      });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
