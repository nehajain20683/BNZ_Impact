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

    // Never send secret values to the browser — only whether they're set.
    // The edit UI treats these as write-only fields.
    const { razorpay_key_secret, razorpay_webhook_secret, ...safeOrg } = org;
    return NextResponse.json({
      org: {
        ...safeOrg,
        razorpay_key_secret_set: !!razorpay_key_secret,
        razorpay_webhook_secret_set: !!razorpay_webhook_secret,
      },
    });
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
      'razorpay_key_id', 'razorpay_key_secret', 'razorpay_webhook_secret',
      'payment_display_name', 'payment_success_message', 'individual_donation_message', 'main_tree_target_percent',
    ];
    const data: any = {};
    for (const k of allowed) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    // Secret fields are write-only from the client's perspective — an empty
    // string means "leave unchanged", not "clear it". Send null explicitly
    // to actually clear a stored secret.
    for (const k of ['razorpay_key_secret', 'razorpay_webhook_secret']) {
      if (data[k] === '') delete data[k];
    }
    // Defensive defaults — a single-field edit should never fail because an
    // unrelated field arrived blank/invalid. Never write NaN, never blank out
    // required fields, never store an invalid hex color.
    if ('tree_price' in data) {
      const n = Number(data.tree_price);
      data.tree_price = Number.isFinite(n) && n > 0 ? Math.round(n) : 500;
    }
    if ('name' in data && !String(data.name).trim()) delete data.name;
    if ('primary_color' in data && !/^#[0-9a-fA-F]{6}$/.test(data.primary_color)) {
      data.primary_color = '#2d5a1b';
    }
    if ('plan' in data && !['STARTER', 'PRO', 'ENTERPRISE'].includes(data.plan)) delete data.plan;

    const org = await (prisma as any).organization.update({
      where: { id: params.id },
      data,
    });

    // Clear cache so changes take effect immediately
    invalidateOrgCache(params.id);

    const { razorpay_key_secret, razorpay_webhook_secret, ...safeOrg } = org;
    return NextResponse.json({ success: true, org: safeOrg });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — deactivate org (soft delete)
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const target = await (prisma as any).organization.findUnique({ where: { id: params.id } });
    if (target?.slug === 'bnz-green')
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
