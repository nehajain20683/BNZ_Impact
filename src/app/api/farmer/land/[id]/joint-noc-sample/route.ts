export const runtime = 'nodejs';
// src/app/api/farmer/land/[id]/joint-noc-sample/route.ts
// A printable sample of the Joint Ownership NOC, pre-filled with what's
// already known about this land parcel. Co-owner fields (name, Aadhaar,
// signature) are left blank for the farmer to fill by hand and get signed —
// this is a downloadable sample, not the final signed document.
import prisma from '@/lib/prisma';
import { generateJointOwnerNOC } from '@/lib/doc-templates';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const land = await prisma.land.findUnique({
    where: { id: params.id },
    include: { farmer: { include: { organization: true } } },
  });
  if (!land) return new Response('Land parcel not found', { status: 404 });

  const org = land.farmer.organization
    ? { name: land.farmer.organization.name, logoUrl: land.farmer.organization.logo_url, email: land.farmer.organization.email }
    : undefined;

  const html = generateJointOwnerNOC({
    ownerName: '', // left blank — the co-owner fills this in by hand
    surveyNumber: land.surveyGutNumber || undefined,
    village: land.village || undefined,
    taluka: land.taluka || undefined,
    district: land.district || undefined,
    areaAcres: land.areaAcres || undefined,
    primaryOwnerName: land.farmer.fullName,
    org,
  });

  const page = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Joint Ownership NOC — Sample</title>
  <style>
    @page { margin: 20mm; }
    @media print { .no-print { display: none !important; } }
    body { margin: 0; background: #f5f5f5; font-family: sans-serif; }
    .toolbar { position: fixed; top: 0; left: 0; right: 0; background: #1a2e0a; color: white; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; z-index: 100; }
    .toolbar button { background: #2d5a1b; border: none; color: white; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; margin-left: 8px; }
    .content-wrap { padding: 90px 16px 32px; }
    .doc-card { background: white; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); max-width: 860px; margin: 0 auto; }
    .instructions { max-width: 860px; margin: 0 auto 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; font-size: 13px; color: #92400e; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <span style="font-size:13px;font-weight:600">📄 Joint Ownership NOC — Sample</span>
    <div>
      <button onclick="window.print()">⬇ Download / Print</button>
      <button onclick="window.history.back()">✕ Close</button>
    </div>
  </div>
  <div class="content-wrap">
    <div class="instructions no-print">
      <strong>How to use this sample:</strong> Print or download this page. Every co-owner of this
      land (anyone other than yourself listed on the ownership record) fills in their own name,
      father's/husband's name, age, address, and Aadhaar number, then signs at the bottom with a witness.
      Once signed by all co-owners, scan or photograph the signed copy and upload it under
      <strong>My Land → Documents → Ownership Proof</strong> for this parcel. This is required before
      admin can approve the land.
    </div>
    <div class="doc-card">
      ${html}
    </div>
  </div>
</body>
</html>`;

  return new Response(page, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
