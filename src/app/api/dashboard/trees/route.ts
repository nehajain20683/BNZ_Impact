export const runtime = 'nodejs';
// src/app/api/dashboard/trees/route.ts
// Paginated + filterable tree list for the logged-in donor. Keeps large tree
// counts (100s+) from ever being loaded into one unpaginated server response.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page       = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize   = Math.min(96, Math.max(1, parseInt(searchParams.get('pageSize') || '24')));
  const donationId = searchParams.get('donationId') || undefined;
  const siteId     = searchParams.get('siteId') || undefined;
  const status     = searchParams.get('status') || undefined;
  const linked     = searchParams.get('linked') || undefined; // 'true' | 'false'
  const search     = searchParams.get('search') || undefined;
  const sort       = searchParams.get('sort') === 'oldest' ? 'asc' : 'desc';

  const where: any = {
    donation: { userId: user.id, paymentStatus: 'COMPLETED' },
  };
  if (donationId) where.donationId = donationId;
  if (siteId)     where.siteId = siteId;
  if (status)      where.status = status;
  // Explicit, unambiguous "has this specific sponsored tree actually been
  // matched to a real farmer's planted land yet" — set together with
  // status/siteId by "Link Sponsored Trees", so assignmentId is the
  // reliable signal, not an inference from status alone.
  if (linked === 'true')  where.assignmentId = { not: null };
  if (linked === 'false') where.assignmentId = null;
  if (search)      where.treeTagId = { contains: search, mode: 'insensitive' };

  const [trees, total] = await Promise.all([
    prisma.tree.findMany({
      where,
      include: {
        plantationSite: { select: { id: true, siteName: true, district: true, state: true } },
        images: { select: { imageUrl: true, capturedAt: true }, orderBy: { capturedAt: 'desc' }, take: 1 },
      },
      orderBy: { plantedDate: sort },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tree.count({ where }),
  ]);

  return NextResponse.json({
    trees: trees.map(t => ({ ...t, lastUpdatedAt: t.images[0]?.capturedAt || t.updatedAt })),
    total, page, pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
