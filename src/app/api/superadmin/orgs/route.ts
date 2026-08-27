export const runtime = 'nodejs';
// src/app/api/superadmin/orgs/route.ts
// Only accessible to SUPER_ADMIN role
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'SUPER_ADMIN')
    throw new Error('Unauthorized');
  return session.user as any;
}

// GET — list all organizations
export async function GET() {
  try {
    await requireSuperAdmin();
    const orgs = await (prisma as any).organization.findMany({
      orderBy: { created_at: 'desc' },
    });
    // Attach counts for each org
    const orgsWithCounts = await Promise.all(orgs.map(async (org: any) => {
      const [donations, farmers, sites] = await Promise.all([
        prisma.donation.count({ where: { orgId: org.id } }).catch(() => 0),
        prisma.farmer.count({ where: { orgId: org.id } }).catch(() => 0),
        prisma.plantationSite.count({ where: { orgId: org.id } }).catch(() => 0),
      ]);
      return { ...org, _counts: { donations, farmers, sites } };
    }));
    return NextResponse.json({ orgs: orgsWithCounts });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}

// POST — create new organization
export async function POST(req: Request) {
  try {
    await requireSuperAdmin();
    const body = await req.json();

    if (!body.name || !body.slug)
      return NextResponse.json({ error: 'name and slug are required' }, { status: 400 });

    // Check slug is unique
    const existing = await (prisma as any).organization.findUnique({ where: { slug: body.slug } });
    if (existing)
      return NextResponse.json({ error: 'Slug already taken' }, { status: 400 });

    const org = await (prisma as any).organization.create({
      data: {
        name:                body.name,
        slug:                body.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        primary_color:       body.primaryColor       || '#2d5a1b',
        logo_url:            body.logoUrl            || null,
        email:               body.email              || null,
        phone:               body.phone              || null,
        address:             body.address            || null,
        website:             body.website            || null,
        farmer_id_prefix:    body.farmerIdPrefix     || body.slug.toUpperCase().slice(0, 4),
        donation_ref_prefix: body.donationRefPrefix  || body.slug.toUpperCase().slice(0, 6),
        tree_price:          body.treePrice          ? parseInt(body.treePrice) : 500,
        org_80g_number:      body.org80gNumber       || null,
        payment_banks:       body.paymentBanks       || [],
        campaign_config:     body.campaignConfig     || null,
        custom_domain:       body.customDomain       || null,
        plan:                body.plan               || 'STARTER',
        active:              true,
      },
    });

    // Every tenant needs at least one campaign for the public site to show
    // anything donatable — seed a starter one so a brand-new org is never
    // empty before Super Admin/Admin configures real campaigns.
    await prisma.campaign.create({
      data: {
        orgId:  org.id,
        name:   'General Tree Sponsorship',
        slug:   `${org.slug}-general`,
        shortName: 'General',
        subtitle: 'Support our tree plantation programme',
        description: 'Sponsor trees to support this organisation\'s plantation and carbon-impact programme.',
        dedicationLabel: 'Someone Special',
        treePrice: org.tree_price || 500,
        active: true,
        displayOrder: 0,
      },
    }).catch((e) => console.error('Failed to seed default campaign for new org:', e));

    return NextResponse.json({ success: true, org });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}