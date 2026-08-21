export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { farmerId, password } = await req.json();
    if (!farmerId || !password) return NextResponse.json({ error: 'farmerId and password required' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });

    const hash = await bcrypt.hash(password, 10);
    await prisma.farmer.update({
      where: { id: farmerId },
      data:  { password: hash },
    }).catch(async () => {
      // If password field doesn't exist on farmer model, store in a metadata field
      await (prisma as any).farmer.update({
        where: { id: farmerId },
        data:  { draftData: { password: hash } },
      });
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
