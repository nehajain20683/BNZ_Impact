export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { resolveTenantFromRequest } from '@/lib/tenant';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, mobile } = body;

    if (!name || !email || !password)
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });

    // Resolve tenant from domain/subdomain — auto-assigns to correct org
    const org = await resolveTenantFromRequest(req);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hash, mobile: mobile || undefined,
              role: 'DONOR', orgId: org.id },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ success: true, user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
