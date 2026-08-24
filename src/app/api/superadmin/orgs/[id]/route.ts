export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { invalidateOrgCache } from '@/lib/tenant';

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'SUPER_ADMIN')
    throw new Error('Unauthorized');
}

// GET — single org
export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const org = await (prisma as any).organization.findUnique({ where: { id: params.id } });
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ org });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH — update org
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const body = await req.json();

    const allowed = [
      'name', 'primary_color', 'logo_url', 'email', 'phone', 'address',
      'website', 'farmer_id_prefix', 'donation_ref_prefix', 'tree_price',
      'org_80g_number', 'payment_banks', 'campaign_config', 'custom_domain',
      'plan', 'active', 'privacy_policy_text', 'terms_text', 'refund_policy_text',
    ];
    const data: any = {};
    for (const k of allowed) {
      if (body[k] !== undefined) data[k] = body[k];
    }

    const org = await (prisma as any).organization.update({
      where: { id: params.id },
      data,
    });

    // Clear cache so changes take effect immediately
    invalidateOrgCache(params.id);

    return NextResponse.json({ success: true, org });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — deactivate org (soft delete)
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    if (params.id === 'org_jito_mumbai')
      return NextResponse.json({ error: 'Cannot deactivate the primary organization' }, { status: 400 });

    await (prisma as any).organization.update({
      where: { id: params.id },
      data: { active: false },
    });
    invalidateOrgCache(params.id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
