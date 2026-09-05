export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

export async function GET() {
  try {
    await requireAdmin();
    const orgId     = await getActiveOrgId();
    const campaigns = await prisma.campaign.findMany({
      where:   { orgId },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json({ campaigns });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const body  = await req.json();

    if (!body.name || !body.slug)
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });

    const slug = String(body.slug).trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    const existing = await prisma.campaign.findUnique({ where: { slug } });
    if (existing)
      return NextResponse.json({ error: 'A campaign with this slug already exists' }, { status: 400 });

    const campaign = await prisma.campaign.create({
      data: {
        orgId, slug,
        name:            body.name,
        subtitle:        body.subtitle || null,
        shortName:       body.shortName || body.name,
        dedicationLabel: body.dedicationLabel || null,
        description:     body.description || null,
        imageUrl:        body.imageUrl || null,
        galleryImages:   Array.isArray(body.galleryImages) ? body.galleryImages : [],
        perks:           Array.isArray(body.perks) ? body.perks : undefined,
        accentColor:     body.accentColor || '#2d5a1b',
        accentBg:        body.accentBg || '#f6faf3',
        accentBorder:    body.accentBorder || '#c9dcc0',
        treePrice:       body.treePrice ? Number(body.treePrice) : 500,
        goal:            body.goal ? parseInt(body.goal) : null,
        displayOrder:    body.displayOrder ? parseInt(body.displayOrder) : 0,
        packages:        Array.isArray(body.packages) ? body.packages : undefined,
        active:          body.active !== false,
      },
    });
    return NextResponse.json({ success: true, campaign });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
