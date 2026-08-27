export const runtime = 'nodejs';
// src/app/api/dashboard/trees/[id]/route.ts
// The "Tree's Story" data — walks Tree → LandAssignment → Farmer + Land,
// the link that previously didn't exist (Tree.assignmentId). Falls back
// gracefully to site-level info only for trees planted before this link
// existed.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tree = await (prisma as any).tree.findFirst({
    where: { id: params.id, donation: { userId: user.id } }, // ownership check — only the donor's own tree
    include: {
      donation: { select: { campaign: { select: { name: true, subtitle: true } }, dedicationName: true, createdAt: true } },
      plantationSite: { select: { id: true, siteName: true, district: true, state: true, currentPhase: true } },
      assignment: {
        include: {
          farmer: { select: { id: true, fullName: true, village: true, district: true, state: true } },
          land: { select: { id: true, village: true, taluka: true, district: true, gpsLatitude: true, gpsLongitude: true } },
        },
      },
    },
  });

  if (!tree) return NextResponse.json({ error: 'Tree not found' }, { status: 404 });

  // Only officially published monitoring reaches the donor — same rule as
  // the main donor dashboard and the admin farmer detail impact summary.
  const verifiedVisits = tree.plantationSite
    ? await (prisma as any).monitoringVisit.findMany({
        where: { siteId: tree.plantationSite.id, donorVisible: true },
        orderBy: { visitDate: 'desc' },
        take: 8,
      }).catch(() => [])
    : [];

  return NextResponse.json({
    tree: {
      id: tree.id, treeTagId: tree.treeTagId, species: tree.species, status: tree.status,
      plantedDate: tree.plantedDate, imageUrl: tree.imageUrl,
      geoLatitude: tree.geoLatitude, geoLongitude: tree.geoLongitude,
      expectedCO2: tree.expectedCO2,
    },
    campaign: tree.donation.campaign,
    dedicationName: tree.donation.dedicationName,
    donatedAt: tree.donation.createdAt,
    site: tree.plantationSite,
    // Only present once an admin has actually linked this tree to a specific
    // farmer's land via "Link Sponsored Trees" — otherwise we only know the site.
    farmer: tree.assignment?.farmer || null,
    land: tree.assignment?.land || null,
    verifiedVisits,
  });
}
