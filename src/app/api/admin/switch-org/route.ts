export const runtime = 'nodejs';
// src/app/api/admin/switch-org/route.ts
// SUPER_ADMIN only — sets activeOrgId cookie
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user    = session?.user as any;

    if (!user || user.role !== 'SUPER_ADMIN')
      return NextResponse.json({ error: 'SUPER_ADMIN only' }, { status: 403 });

    const { orgId } = await req.json();
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 });

    // Verify org exists
    const org = await (prisma as any).organization.findUnique({ where: { id: orgId } });
    if (!org) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });

    const res = NextResponse.json({ success: true, org: { id: org.id, name: org.name, slug: org.slug } });

    // Set cookie — httpOnly, 8hr expiry
    res.cookies.set('activeOrgId', orgId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge:   60 * 60 * 8, // 8 hours
      path:     '/',
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET — return current active org info
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user    = session?.user as any;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Import cookies dynamically to avoid issues
    const { cookies } = await import('next/headers');
    const activeOrgId = cookies().get('activeOrgId')?.value || user.orgId || 'org_jito_mumbai';

    const org = await (prisma as any).organization.findUnique({
      where: { id: activeOrgId },
      select: { id: true, name: true, slug: true, primary_color: true },
    });

    // Also return all orgs for switcher dropdown (SUPER_ADMIN only)
    let allOrgs: any[] = [];
    if (user.role === 'SUPER_ADMIN') {
      allOrgs = await (prisma as any).organization.findMany({
        where:   { active: true },
        select:  { id: true, name: true, slug: true, primary_color: true },
        orderBy: { name: 'asc' },
      });
    }

    return NextResponse.json({ activeOrg: org, allOrgs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
