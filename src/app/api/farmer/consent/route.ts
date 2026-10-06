export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// src/app/api/farmer/consent/route.ts
// GET  — the declaration rendered from the farmer's saved details, shown when
//        they tap "Terms and Conditions" on the registration Consent step.
// POST — called by "Complete Registration". Stores an immutable snapshot of
//        exactly what was shown (with an integrity hash and the acceptance
//        time) as a FarmerAgreement, so it appears in the farmer's Documents
//        section and can later be shared for signature. Idempotent: Edit
//        Profile re-runs the final step and must not create duplicates.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { loadConsentInput } from '@/lib/consent-context';
import {
  generateConsentDeclarationHtml, buildConsentSnapshot, renderConsentPreviewPage,
  CONSENT_AGREEMENT_TYPE, CONSENT_TITLE,
} from '@/lib/consent-declaration';

export async function GET(req: Request) {
  const farmerId = new URL(req.url).searchParams.get('farmerId');
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' };
  if (!farmerId) return new Response('<p style="font-family:sans-serif;padding:24px">farmerId required</p>', { status: 400, headers });

  const ctx = await loadConsentInput(farmerId);
  if (!ctx) return new Response('<p style="font-family:sans-serif;padding:24px">Farmer not found</p>', { status: 404, headers });

  const html = renderConsentPreviewPage(
    generateConsentDeclarationHtml(ctx.input),
    'Preview — this is the declaration that will be recorded when you tap Complete Registration.',
  );
  return new Response(html, { headers });
}

export async function POST(req: Request) {
  try {
    const { farmerId } = await req.json();
    if (!farmerId) return NextResponse.json({ error: 'farmerId required' }, { status: 400 });

    const ctx = await loadConsentInput(farmerId);
    if (!ctx) return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });

    const existing = await prisma.farmerAgreement.findFirst({
      where: { farmerId, agreementType: CONSENT_AGREEMENT_TYPE, landId: ctx.land?.id ?? null },
      select: { id: true, status: true },
    });
    if (existing) return NextResponse.json({ success: true, existing: true, agreement: existing });

    const now = new Date();
    const evidence = {
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      userAgent: req.headers.get('user-agent') || null,
    };
    const snap = buildConsentSnapshot({ ...ctx.input, consentRecordedAt: now }, { consentSource: 'REGISTRATION', consentEvidence: evidence });

    const [agreement] = await prisma.$transaction([
      prisma.farmerAgreement.create({
        data: {
          farmerId, landId: ctx.land?.id ?? undefined, agreementType: CONSENT_AGREEMENT_TYPE,
          title: CONSENT_TITLE, generatedHtml: snap.html, templateData: snap.templateData as any,
          // Visible + downloadable immediately; the sign-and-upload step stays
          // hidden until an admin explicitly requests a signature.
          status: 'ACKNOWLEDGED', acknowledgedAt: now, sharedAt: now,
          signatureHistory: [{ action: 'CONSENT_ACCEPTED_ELECTRONICALLY', by: 'farmer', at: now.toISOString() }] as any,
        },
        select: { id: true, status: true },
      }),
      prisma.farmer.update({ where: { id: farmerId }, data: { carbonConsent: true } }),
    ]);
    return NextResponse.json({ success: true, agreement });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
