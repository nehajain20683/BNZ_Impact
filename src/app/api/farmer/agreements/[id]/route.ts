export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const agreement = await prisma.farmerAgreement.findUnique({ where: { id: params.id } });
  if (!agreement) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Return full HTML page for viewing/printing
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${agreement.title}</title>
  <style>
    @page { margin: 20mm; }
    @media print { .no-print { display: none !important; } }
    body { margin: 0; background: #f5f5f5; }
    .toolbar { position: fixed; top: 0; left: 0; right: 0; background: #1a2e0a; color: white; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; z-index: 100; }
    .toolbar button { background: #2d5a1b; border: none; color: white; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; margin-left: 8px; }
    .content-wrap { padding: 70px 16px 32px; }
    .doc-card { background: white; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); max-width: 860px; margin: 0 auto; }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <span style="font-size:13px;font-weight:600">📄 ${agreement.title}</span>
    <div>
      <button onclick="window.print()">⬇ Download / Print PDF</button>
      <button onclick="window.history.back()">✕ Close</button>
    </div>
  </div>
  <div class="content-wrap">
    <div class="doc-card">
      ${agreement.generatedHtml || '<p style="padding:40px;color:#888">Document content not available</p>'}
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
