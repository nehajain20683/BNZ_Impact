export const runtime = 'nodejs';
// src/app/api/admin/donations/bulk-import/route.ts
// Imports real historical donations (e.g. from a spreadsheet or an old
// system) as genuine Donation + Tree records — the same shape as every
// other donation in this app, so imported trees behave identically:
// they show up in "Link Sponsored Trees", count toward the donor's totals,
// and can be traced back to a farmer's land once linked.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import { resolveTenantFromRequest } from '@/lib/tenant';
import prisma from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role))
    throw new Error('Unauthorized');
  return session.user as any;
}

type ImportRow = {
  donorName: string;
  donorEmail?: string;
  donorMobile?: string;
  numberOfTrees: string | number;
  amount?: string | number;
  campaignSlug?: string;
  donationDate?: string; // ISO or DD/MM/YYYY
  paymentMode?: string;
  notes?: string;
};

function parseHistoricalDate(raw?: string): Date {
  if (!raw) return new Date();
  const iso = new Date(raw);
  if (!isNaN(iso.getTime())) return iso;
  // Fall back to DD/MM/YYYY
  const m = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? `20${y}` : y;
    const d2 = new Date(`${year}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`);
    if (!isNaN(d2.getTime())) return d2;
  }
  return new Date();
}

export async function POST(req: Request) {
  try {
    const actor = await requireAdmin();
    const orgId = await getActiveOrgId();
    const org   = await resolveTenantFromRequest(req);
    const { rows } = await req.json() as { rows: ImportRow[] };

    if (!Array.isArray(rows) || rows.length === 0)
      return NextResponse.json({ error: 'No rows to import' }, { status: 400 });
    if (rows.length > 5000)
      return NextResponse.json({ error: 'Maximum 5,000 rows per import — split into smaller batches' }, { status: 400 });

    // Cache campaigns and a running donation count so we don't re-query
    // per row across a batch that could be thousands of rows.
    const campaigns = await prisma.campaign.findMany({ where: { orgId }, select: { id: true, slug: true } });
    const campaignBySlug = new Map(campaigns.map(c => [c.slug, c.id]));
    const defaultCampaign = campaigns.find(c => c.slug === 'individual') || campaigns[0];

    let runningCount = await prisma.donation.count({ where: { orgId } });

    const results: { row: number; success: boolean; error?: string; refId?: string }[] = [];
    const CHUNK = 100;

    for (let start = 0; start < rows.length; start += CHUNK) {
      const slice = rows.slice(start, start + CHUNK);

      for (let i = 0; i < slice.length; i++) {
        const rowIndex = start + i;
        const row = slice[i];
        try {
          if (!row.donorName || !row.donorName.trim()) throw new Error('donorName is required');
          const numberOfTrees = parseInt(String(row.numberOfTrees)) || 0;
          if (numberOfTrees < 1) throw new Error('numberOfTrees must be at least 1');

          const campaignId = (row.campaignSlug && campaignBySlug.get(row.campaignSlug)) || defaultCampaign?.id;
          if (!campaignId) throw new Error('No campaign available for this organisation');

          const amount = row.amount ? parseFloat(String(row.amount)) : numberOfTrees * (org.treePrice || 500);
          runningCount += 1;
          const refId = `#${org.donationRefPrefix || 'JGL'}-${String(runningCount).padStart(5, '0')}`;
          const receiptNumber = `${org.donationRefPrefix || 'JGL'}${Date.now().toString().slice(-8)}${String(rowIndex).padStart(3,'0')}`;
          const createdAt = parseHistoricalDate(row.donationDate);

          const donation = await prisma.donation.create({
            data: {
              campaignId, orgId,
              donorName:     row.donorName.trim(),
              certificateName: row.donorName.trim(),
              donorEmail:    row.donorEmail || '',
              donorMobile:   row.donorMobile || undefined,
              numberOfTrees, amount,
              paymentStatus: 'COMPLETED',
              paymentMode:   row.paymentMode || 'IMPORTED',
              notes:         row.notes || 'Bulk-imported historical donation',
              receiptNumber, refId,
              createdById:   actor.id,
              createdAt,
            } as any,
          });

          await prisma.tree.createMany({
            data: Array.from({ length: numberOfTrees }, () => ({
              donationId: donation.id, status: 'PENDING' as const, expectedCO2: 22,
            })),
          });

          results.push({ row: rowIndex, success: true, refId });
        } catch (e: any) {
          results.push({ row: rowIndex, success: false, error: e.message });
        }
      }
    }

    const succeeded = results.filter(r => r.success).length;
    return NextResponse.json({
      success: true,
      imported: succeeded,
      failed: results.length - succeeded,
      results,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
