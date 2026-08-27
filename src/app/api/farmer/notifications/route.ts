export const runtime = 'nodejs';
// src/app/api/farmer/notifications/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const farmerId = searchParams.get('farmerId');
  if (!farmerId) return NextResponse.json({ error: 'farmerId required' }, { status: 400 });

  try {
    const notifications = await (prisma as any).notification.findMany({
      where: { recipientType: 'FARMER', recipientId: farmerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await (prisma as any).notification.count({
      where: { recipientType: 'FARMER', recipientId: farmerId, read: false },
    });
    return NextResponse.json({ notifications, unreadCount });
  } catch (e: any) {
    // Never let a notifications failure (e.g. a pending migration) break the
    // page that called this — always return a valid, empty shape instead.
    console.error('[farmer notifications GET]', e.message);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { farmerId, id, markAllRead } = body;
    if (!farmerId) return NextResponse.json({ error: 'farmerId required' }, { status: 400 });

    if (markAllRead) {
      await (prisma as any).notification.updateMany({
        where: { recipientType: 'FARMER', recipientId: farmerId, read: false },
        data: { read: true },
      });
    } else if (id) {
      await (prisma as any).notification.updateMany({
        where: { id, recipientType: 'FARMER', recipientId: farmerId },
        data: { read: true },
      });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[farmer notifications PATCH]', e.message);
    return NextResponse.json({ success: false });
  }
}
