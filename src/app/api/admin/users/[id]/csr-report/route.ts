export const runtime = 'nodejs';
// src/app/api/admin/users/[id]/csr-report/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import { getOrgConfig } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { generateCSRImpactReport } from '@/lib/csr-report';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();

    const user = await prisma.user.findFirst({
      where: { id: params.id, orgId },
      select: { id: true, name: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found in this organisation' }, { status: 404 });

    const donations = await prisma.donation.findMany({
      where: { userId: params.id, paymentStatus: 'COMPLETED' },
      include: {
        campaign: { select: { name: true } },
        trees: {
          select: {
            id: true, species: true, status: true, assignmentId: true,
            plantationSite: { select: { siteName: true, district: true, state: true } },
            images: { select: { imageUrl: true }, orderBy: { capturedAt: 'desc' }, take: 1 },
          },
        },
      },
    });

    if (donations.length === 0)
      return NextResponse.json({ error: 'This donor has no completed donations — nothing to report on yet.' }, { status: 400 });

    const [org, orgSignatoryRecord] = await Promise.all([
      getOrgConfig(orgId),
      prisma.orgSignatory.findFirst({ where: { orgId, isPrimary: true } }),
    ]);

    const allTrees = donations.flatMap(d => d.trees);
    const plantedTrees = allTrees.filter(t => t.status !== 'PENDING');
    const totalDonated = donations.reduce((s, d) => s + d.amount, 0);
    const totalTreesSponsored = donations.reduce((s, d) => s + d.numberOfTrees, 0);

    // Survival — a simple, defensible read directly off Tree.status: any
    // tree not marked DEAD counts as surviving. Deliberately not an
    // elaborate weighted average across monitoring visits — a corporate
    // reader needs one honest number, not a methodology footnote.
    const statusedTrees = allTrees.filter(t => t.status !== 'PENDING');
    const deadCount = statusedTrees.filter(t => t.status === 'DEAD').length;
    const survivalPct = statusedTrees.length > 0
      ? Math.round(((statusedTrees.length - deadCount) / statusedTrees.length) * 100)
      : null;

    const estimatedCO2Kg = plantedTrees.length * 0.022 * 0.87 * 25 * 1000; // kg, same per-tree constant used org-wide, scaled to kg

    // Campaigns
    const campaignMap: Record<string, { name: string; trees: number; amount: number }> = {};
    for (const d of donations) {
      const key = d.campaign?.name || 'Individual Sponsorship';
      if (!campaignMap[key]) campaignMap[key] = { name: key, trees: 0, amount: 0 };
      campaignMap[key].trees += d.numberOfTrees;
      campaignMap[key].amount += d.amount;
    }

    // Sites
    const siteMap: Record<string, { name: string; district: string; state: string; trees: number; dead: number; statused: number }> = {};
    for (const t of allTrees) {
      if (!t.plantationSite) continue;
      const key = t.plantationSite.siteName;
      if (!siteMap[key]) siteMap[key] = { name: key, district: t.plantationSite.district || '', state: t.plantationSite.state || '', trees: 0, dead: 0, statused: 0 };
      siteMap[key].trees += 1;
      if (t.status !== 'PENDING') { siteMap[key].statused += 1; if (t.status === 'DEAD') siteMap[key].dead += 1; }
    }
    const sites = Object.values(siteMap).map(s => ({
      name: s.name, district: s.district, state: s.state, trees: s.trees,
      survivalPct: s.statused > 0 ? Math.round(((s.statused - s.dead) / s.statused) * 100) : null,
    }));

    // Species
    const speciesMap: Record<string, number> = {};
    for (const t of allTrees) {
      if (!t.species) continue;
      speciesMap[t.species] = (speciesMap[t.species] || 0) + 1;
    }
    const totalSpeciesCount = Object.values(speciesMap).reduce((a, b) => a + b, 0);
    const species = Object.entries(speciesMap)
      .map(([name, count]) => ({ name, count, pct: totalSpeciesCount > 0 ? Math.round((count / totalSpeciesCount) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);

    // Real evidence photos — from actual field officer captures, never a stock image
    const samplePhotos = allTrees.map(t => t.images[0]?.imageUrl).filter((u): u is string => !!u).slice(0, 4);

    const html = generateCSRImpactReport({
      donorName: user.name || 'Valued Supporter',
      reportPeriod: 'All-time (since first donation)',
      generatedOn: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
      totalDonated, totalTreesSponsored, totalTreesPlanted: plantedTrees.length,
      survivalPct, estimatedCO2Kg,
      campaigns: Object.values(campaignMap),
      sites, species, samplePhotos,
      org: { name: org?.name || 'BNZ Impact', logoUrl: org?.logoUrl || null, org80gNumber: org?.org80gNumber || null },
      orgSignatory: orgSignatoryRecord
        ? { name: orgSignatoryRecord.name, designation: orgSignatoryRecord.designation, signatureImage: orgSignatoryRecord.signatureImage }
        : null,
    });

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="csr-impact-report-${user.name?.replace(/\s+/g, '-') || 'donor'}.html"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
