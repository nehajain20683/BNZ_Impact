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
