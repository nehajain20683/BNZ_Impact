export const runtime = 'nodejs';
// src/app/api/public/org-config/route.ts
// Public endpoint — no auth required
// Returns branding config for the current tenant
// NO CDN caching — each deployment must return its own org config
import { NextResponse } from 'next/server';
import { resolveTenantFromRequest } from '@/lib/tenant';

export async function GET(req: Request) {
  try {
    const org = await resolveTenantFromRequest(req);
    return NextResponse.json({
      id:           org.id,
      name:         org.name,
      slug:         org.slug,
      primaryColor: org.primaryColor,
      logoUrl:      org.logoUrl,
      email:        org.email,
      phone:        org.phone,
      website:      org.website,
      treePrice:    org.treePrice,
      plan:         org.plan,
      paymentSuccessMessage: org.paymentSuccessMessage,
    }, {
      headers: {
        // No CDN caching — tenant-specific, must be fresh per deployment
        'Cache-Control': 'no-store, no-cache',
        'Vary':          'host',
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
