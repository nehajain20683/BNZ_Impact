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

    const normalizedEmail = String(email).trim().toLowerCase();

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_RE.test(normalizedEmail))
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });

    if (String(password).length < 8)
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

    // Signup always creates a regular (DONOR) account — role is never taken
    // from the request body, so this endpoint cannot be used to create
    // ADMIN or SUPER_ADMIN accounts.
    if (normalizedEmail === 'sadmin@bnzgreen.io')
      return NextResponse.json({ error: 'This email address is reserved' }, { status: 400 });

    // Resolve tenant from domain/subdomain — auto-assigns to correct org
    const org = await resolveTenantFromRequest(req);

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing)
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email: normalizedEmail, password: hash, mobile: mobile || undefined,
              role: 'DONOR', orgId: org.id },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ success: true, user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
