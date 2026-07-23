export const runtime = 'nodejs';
// src/app/api/public/org-config/route.ts
// Public endpoint — no auth required
// Returns branding config for the current tenant
import { NextResponse } from 'next/server';
import { resolveTenantFromRequest } from '@/lib/tenant';

export async function GET(req: Request) {
  try {
    const org = await resolveTenantFromRequest(req);

    // Only return safe public fields — no secrets
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
    }, {
      headers: {
        // Cache for 60 seconds on CDN, revalidate in background
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
