export const runtime = 'nodejs';
// src/app/api/admin/species-images/route.ts
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
    const orgId = await getActiveOrgId();
    const images = await (prisma as any).speciesImage.findMany({ where: { orgId }, orderBy: { species: 'asc' } });
    return NextResponse.json({ images });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}

// POST — upsert (create or replace) the image for one species
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const { species, imageUrl, category } = await req.json();

    if (!species || !species.trim()) return NextResponse.json({ error: 'Species name is required' }, { status: 400 });
    if (category && !['MAIN', 'SIDE'].includes(category)) return NextResponse.json({ error: 'category must be MAIN or SIDE' }, { status: 400 });

    // imageUrl is optional on this path so category can be set/changed
    // without re-uploading a photo — but at least one of the two is needed.
    const existing = await (prisma as any).speciesImage.findUnique({ where: { orgId_species: { orgId, species: species.trim() } } });
    if (!imageUrl && !existing) return NextResponse.json({ error: 'An image is required for a new species' }, { status: 400 });
    if (imageUrl && imageUrl.length > 3_000_000) return NextResponse.json({ error: 'Image is too large — please use a smaller file (under ~2MB)' }, { status: 400 });

    const image = await (prisma as any).speciesImage.upsert({
      where: { orgId_species: { orgId, species: species.trim() } },
      update: { ...(imageUrl ? { imageUrl } : {}), ...(category !== undefined ? { category } : {}) },
      create: { orgId, species: species.trim(), imageUrl: imageUrl || '', category: category || 'SIDE' },
    });

    return NextResponse.json({ success: true, image });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const existing = await (prisma as any).speciesImage.findFirst({ where: { id, orgId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await (prisma as any).speciesImage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
