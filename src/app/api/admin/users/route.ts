export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN','SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

// GET — list all users for active org
export async function GET() {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();

    const users = await prisma.user.findMany({
      where:   { orgId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, mobile: true,
        role: true, orgId: true, createdAt: true,
      },
    });

    return NextResponse.json({ users });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}

// POST — create new user
export async function POST(req: Request) {
  try {
    const actor = await requireAdmin();
    const orgId = await getActiveOrgId();
    const body  = await req.json();

    if (!body.email || !body.name)
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing)
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });

    const password = body.password || 'Welcome@123';
    const hash     = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name:     body.name,
        email:    body.email,
        mobile:   body.mobile   || undefined,
        password: hash,
        role:     body.role     || 'DONOR',
        orgId,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    await prisma.auditLog.create({
      data: {
        actorId:   actor.id,
        actorRole: actor.role,
        action:    'USER_CREATED',
        details:   { userId: user.id, email: user.email, role: user.role, orgId },
      }
    }).catch(() => {});

    return NextResponse.json({ success: true, user, tempPassword: password });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH — update user role or deactivate
export async function PATCH(req: Request) {
  try {
    const actor = await requireAdmin();
    const orgId = await getActiveOrgId();
    const { userId, role, name, mobile } = await req.json();

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    // Ensure user belongs to this org
    const existing = await prisma.user.findFirst({ where: { id: userId, orgId } });
    if (!existing) return NextResponse.json({ error: 'User not found in this organisation' }, { status: 404 });

    // Prevent downgrading own account
    if (userId === actor.id && role && role !== actor.role)
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });

    const data: any = {};
    if (role)   data.role   = role;
    if (name)   data.name   = name;
    if (mobile) data.mobile = mobile;

    const user = await prisma.user.update({ where: { id: userId }, data,
      select: { id: true, name: true, email: true, role: true } });

    return NextResponse.json({ success: true, user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — remove user from org (soft — set orgId to null)
export async function DELETE(req: Request) {
  try {
    const actor = await requireAdmin();
    const orgId = await getActiveOrgId();
    const { userId } = await req.json();

    if (userId === actor.id)
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });

    const existing = await prisma.user.findFirst({ where: { id: userId, orgId } });
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Soft delete — remove from org but keep account
    await prisma.user.update({ where: { id: userId }, data: { orgId: null } });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
