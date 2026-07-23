export const runtime = 'nodejs';
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
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}