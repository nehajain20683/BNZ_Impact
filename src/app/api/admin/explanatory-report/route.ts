export const runtime = 'nodejs';
// src/app/api/admin/explanatory-report/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import { getOrgConfig } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import {
  generateFundraisingReport, generateLandOwnerReport,
  generatePlantationReport, generateCarbonReport, generateBRSRExtract,
} from '@/lib/org-reports';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
}

const CO2_PER_TREE_KG = 0.022 * 0.87 * 25 * 1000; // same constant used org-wide, kept identical on purpose

function currentFY(): { label: string; start: Date; end: Date } {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1; // FY starts April
  return { label: `${year}-${String(year + 1).slice(2)}`, start: new Date(year, 3, 1), end: new Date(year + 1, 2, 31, 23, 59, 59) };
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const orgId = await getActiveOrgId();
    const type = new URL(req.url).searchParams.get('type') || 'fundraising';

    const [orgConfig, orgSignatoryRecord] = await Promise.all([
      getOrgConfig(orgId),
      prisma.orgSignatory.findFirst({ where: { orgId, isPrimary: true } }),
    ]);
    const org = { name: orgConfig?.name || 'BNZ Impact', logoUrl: orgConfig?.logoUrl || null, org80gNumber: orgConfig?.org80gNumber || null };
    const orgSignatory = orgSignatoryRecord
      ? { name: orgSignatoryRecord.name, designation: orgSignatoryRecord.designation, signatureImage: orgSignatoryRecord.signatureImage }
      : null;
    const generatedOn = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    let html = '';

    if (type === 'fundraising') {
      const donations = await prisma.donation.findMany({
        where: { orgId, paymentStatus: 'COMPLETED' },
        include: { campaign: { select: { name: true } } },
      });
      const totalRaised = donations.reduce((s, d) => s + d.amount, 0);
      const donorCount = new Set(donations.map(d => d.userId).filter(Boolean)).size;
      const totalTreesSponsored = donations.reduce((s, d) => s + d.numberOfTrees, 0);

      const campaignMap: Record<string, { name: string; donors: Set<string>; trees: number; amount: number }> = {};
      const monthMap: Record<string, number> = {};
      for (const d of donations) {
        const key = d.campaign?.name || 'Individual Sponsorship';
        if (!campaignMap[key]) campaignMap[key] = { name: key, donors: new Set(), trees: 0, amount: 0 };
        if (d.userId) campaignMap[key].donors.add(d.userId);
        campaignMap[key].trees += d.numberOfTrees;
        campaignMap[key].amount += d.amount;

        const mKey = new Date(d.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        monthMap[mKey] = (monthMap[mKey] || 0) + d.amount;
      }

      html = generateFundraisingReport({
        org, orgSignatory, generatedOn,
        totalRaised, donorCount, totalTreesSponsored,
        avgDonation: donations.length > 0 ? totalRaised / donations.length : 0,
        campaigns: Object.values(campaignMap).map(c => ({ name: c.name, donors: c.donors.size, trees: c.trees, amount: c.amount })),
        monthly: Object.entries(monthMap).map(([month, amount]) => ({ month, amount })),
      });
    }

    if (type === 'land-owners') {
      const farmers = await prisma.farmer.findMany({
        where: { orgId },
        select: { status: true, district: true, lands: { select: { areaAcres: true } } },
      });
      const districtMap: Record<string, number> = {};
      let totalLandAcres = 0;
      for (const f of farmers) {
        if (f.district) districtMap[f.district] = (districtMap[f.district] || 0) + 1;
        totalLandAcres += f.lands.reduce((s, l) => s + (l.areaAcres || 0), 0);
      }

      html = generateLandOwnerReport({
        org, orgSignatory, generatedOn,
        total: farmers.length,
        verified: farmers.filter(f => f.status === 'VERIFIED_LAND_OWNER').length,
        docsPending: farmers.filter(f => f.status === 'DOCUMENTS_PENDING').length,
        registered: farmers.filter(f => f.status === 'REGISTERED').length,
        totalLandAcres,
        districts: Object.entries(districtMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      });
    }

    if (type === 'plantation') {
      const sites = await prisma.plantationSite.findMany({
        where: { orgId, active: true },
        select: {
          siteName: true, district: true, currentPhase: true,
          treesPlanted: true, plannedTrees: true, totalPlannedArea: true,
          landAssignments: { select: { speciesPlanted: true } },
        },
      });
      const speciesTotals: Record<string, number> = {};
      for (const s of sites) {
        for (const a of s.landAssignments) {
          for (const sp of (a.speciesPlanted as any[]) || []) {
            if (sp?.species && sp?.qty) speciesTotals[sp.species] = (speciesTotals[sp.species] || 0) + sp.qty;
          }
        }
      }
      const totalSpecies = Object.values(speciesTotals).reduce((a, b) => a + b, 0);

      html = generatePlantationReport({
        org, orgSignatory, generatedOn,
        totalPlanted: sites.reduce((s, x) => s + x.treesPlanted, 0),
        totalPlanned: sites.reduce((s, x) => s + (x.plannedTrees || 0), 0),
        siteCount: sites.length,
        totalAcres: sites.reduce((s, x) => s + (x.totalPlannedArea || 0), 0),
        sites: sites.map(s => ({ name: s.siteName, phase: s.currentPhase, planted: s.treesPlanted, planned: s.plannedTrees || 0, district: s.district || '' })),
        species: Object.entries(speciesTotals)
          .map(([name, count]) => ({ name, count, pct: totalSpecies > 0 ? Math.round((count / totalSpecies) * 100) : 0 }))
          .sort((a, b) => b.count - a.count),
      });
    }

    if (type === 'carbon') {
      const sites = await prisma.plantationSite.findMany({
        where: { orgId, active: true },
        select: { siteName: true, treesPlanted: true },
      });
      const totalTrees = sites.reduce((s, x) => s + x.treesPlanted, 0);
      html = generateCarbonReport({
        org, orgSignatory, generatedOn,
        totalTrees, totalCO2Kg: totalTrees * CO2_PER_TREE_KG,
        sites: sites.map(s => ({ name: s.siteName, trees: s.treesPlanted, co2Kg: s.treesPlanted * CO2_PER_TREE_KG })),
      });
    }

    if (type === 'brsr') {
      const fy = currentFY();
      const [donations, farmerCount, sites] = await Promise.all([
        prisma.donation.findMany({ where: { orgId, paymentStatus: 'COMPLETED', createdAt: { gte: fy.start, lte: fy.end } }, select: { amount: true } }),
        prisma.farmer.count({ where: { orgId } }),
        prisma.plantationSite.findMany({
          where: { orgId, active: true },
          select: { siteName: true, district: true, state: true, treesPlanted: true, totalPlannedArea: true, gpsLatitude: true },
        }),
      ]);
      const treesPlanted = sites.reduce((s, x) => s + x.treesPlanted, 0);
      const areaAcres = sites.reduce((s, x) => s + (x.totalPlannedArea || 0), 0);

      const trees = await prisma.tree.findMany({ where: { plantationSite: { orgId, active: true }, status: { not: 'PENDING' } }, select: { status: true } });
      const deadCount = trees.filter(t => t.status === 'DEAD').length;
      const survivalPct = trees.length > 0 ? Math.round(((trees.length - deadCount) / trees.length) * 100) : null;

      html = generateBRSRExtract({
        org, orgSignatory, generatedOn,
        financialYear: fy.label,
        totalExpenditure: donations.reduce((s, d) => s + d.amount, 0),
        areaHectares: areaAcres * 0.404686, // 1 acre = 0.404686 hectares
        treesPlanted, survivalPct,
        co2TonnesPerYear: (treesPlanted * CO2_PER_TREE_KG) / 1000,
        landOwnersEngaged: farmerCount,
        sites: sites.map(s => ({ name: s.siteName, district: s.district || '', state: s.state || '', gpsVerified: s.gpsLatitude != null })),
      });
    }

    if (!html) return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': `inline; filename="${type}-report.html"` },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
