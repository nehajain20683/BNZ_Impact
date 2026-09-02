export const runtime = 'nodejs';
// src/app/api/admin/field-officers/route.ts
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

export async function GET() {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const officers = await prisma.fieldOfficer.findMany({
      where: { orgId },
      select: {
        id: true, name: true, email: true, mobile: true, employeeId: true,
        designation: true, district: true, state: true, active: true, lastLoginAt: true,
        createdAt: true, _count: { select: { farmers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ officers });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const body = await req.json();
    const { name, email, mobile, password, employeeId, designation, district, state } = body;

    if (!name || !email || !mobile || !password)
      return NextResponse.json({ error: 'Name, email, mobile and password are required' }, { status: 400 });
    if (password.length < 6)
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });

    const existing = await prisma.fieldOfficer.findFirst({ where: { OR: [{ email }, { mobile }] } });
    if (existing) return NextResponse.json({ error: 'A field officer with this email or mobile already exists' }, { status: 400 });

    const hashed = await bcrypt.hash(password, 10);
    const officer = await prisma.fieldOfficer.create({
      data: {
        orgId, name, email, mobile, password: hashed,
        employeeId: employeeId || undefined, designation: designation || undefined,
        district: district || undefined, state: state || undefined,
      },
      select: { id: true, name: true, email: true, mobile: true },
    });

    return NextResponse.json({ success: true, officer });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
