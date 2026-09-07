export const runtime = 'nodejs';
// Returns org-specific config for admin panel use
// Includes bank details, tree price, prefixes etc.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN','SUPER_ADMIN'].includes((session.user as any).role))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await getActiveOrgId();
    const org   = await (prisma as any).organization.findUnique({
      where:  { id: orgId },
      select: {
        id: true, name: true, slug: true,
        primary_color: true, logo_url: true,
        email: true, phone: true,
        farmer_id_prefix: true, donation_ref_prefix: true,
        tree_price: true, org_80g_number: true,
        payment_banks: true, plan: true,
      },
    });

    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

    return NextResponse.json({ org });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Deliberately scoped to only these two fields — tree price and the 80G
// receipt number were the two things admin needed to be able to set
// without going through Super Admin. Branding, bank details, and org
// identity stay exactly where they were; this isn't a general "admin can
// now edit anything" endpoint.
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await getActiveOrgId();
    const body = await req.json();
    const data: any = {};

    if ('treePrice' in body) {
      const n = Number(body.treePrice);
      if (!Number.isFinite(n) || n <= 0) return NextResponse.json({ error: 'Tree price must be a positive number' }, { status: 400 });
      data.tree_price = Math.round(n);
    }
    if ('org80gNumber' in body) {
      data.org_80g_number = body.org80gNumber?.trim() || null;
    }

    if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

    const updated = await (prisma as any).organization.update({ where: { id: orgId }, data });
    return NextResponse.json({ success: true, org: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
