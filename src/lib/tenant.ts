// src/lib/tenant.ts
// Tenant resolution — reads orgId from request, returns org config from DB
// Called at the top of any API route that needs org-aware behaviour
// Zero impact on existing routes until they opt in

import prisma from '@/lib/prisma';

export type OrgConfig = {
  id:                  string;
  name:                string;
  slug:                string;
  primaryColor:        string;
  logoUrl:             string | null;
  email:               string | null;
  phone:               string | null;
  address:             string | null;
  website:             string | null;
  farmerIdPrefix:      string;
  donationRefPrefix:   string;
  treePrice:           number;
  org80gNumber:        string | null;
  campaignConfig:      any;
  paymentBanks:        any[];
  customDomain:        string | null;
  plan:                string;
  active:              boolean;
};

// In-memory cache: orgId → { config, fetchedAt }
const cache = new Map<string, { config: OrgConfig; fetchedAt: number }>();
const CACHE_TTL_MS = 60_000; // 60 seconds

// Default fallback — always resolves to JITO if nothing else matches
// This means ALL existing routes continue to work unchanged
const DEFAULT_ORG_ID = 'org_jito_mumbai';

export async function getOrgConfig(orgId: string): Promise<OrgConfig | null> {
  // Check cache
  const cached = cache.get(orgId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.config;
  }

  try {
    const org = await (prisma as any).organization.findUnique({
      where: { id: orgId },
    });
    if (!org) return null;

    const config: OrgConfig = {
      id:                 org.id,
      name:               org.name,
      slug:               org.slug,
      primaryColor:       org.primary_color || '#2d5a1b',
      logoUrl:            org.logo_url || null,
      email:              org.email || null,
      phone:              org.phone || null,
      address:            org.address || null,
      website:            org.website || null,
      farmerIdPrefix:     org.farmer_id_prefix || 'JGL',
      donationRefPrefix:  org.donation_ref_prefix || 'JITO',
      treePrice:          org.tree_price || 500,
      org80gNumber:       org.org_80g_number || null,
      campaignConfig:     org.campaign_config || null,
      paymentBanks:       org.payment_banks || [],
      customDomain:       org.custom_domain || null,
      plan:               org.plan || 'STARTER',
      active:             org.active ?? true,
    };

    cache.set(orgId, { config, fetchedAt: Date.now() });
    return config;
  } catch {
    return null;
  }
}

// Resolve org from a request
// Resolution order:
//   1. x-org-id header (set by middleware or API client)
//   2. Custom domain match
//   3. Subdomain match (slug.yourdomain.com)
//   4. Default → JITO (preserves all existing behaviour)
export async function resolveTenantFromRequest(req: Request): Promise<OrgConfig> {
  // 1. Explicit header (set by Next.js middleware)
  const headerOrgId = req.headers.get('x-org-id');
  if (headerOrgId) {
    const org = await getOrgConfig(headerOrgId);
    if (org) return org;
  }

  // 2. Host-based resolution
  const host = req.headers.get('host') || '';
  const hostname = host.split(':')[0]; // strip port

  if (hostname && hostname !== 'localhost') {
    // Try custom domain first
    try {
      const byDomain = await (prisma as any).organization.findUnique({
        where: { custom_domain: hostname },
      });
      if (byDomain) {
        const config = await getOrgConfig(byDomain.id);
        if (config) return config;
      }
    } catch {}

    // Try subdomain (e.g. rotary.bnzgreen.io → slug = "rotary")
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const slug = parts[0];
      try {
        const bySlug = await (prisma as any).organization.findFirst({
          where: { slug },
        });
        if (bySlug) {
          const config = await getOrgConfig(bySlug.id);
          if (config) return config;
        }
      } catch {}
    }
  }

  // 4. Default → JITO — all existing routes hit this path
  const fallback = await getOrgConfig(DEFAULT_ORG_ID);
  return fallback || {
    id:                 DEFAULT_ORG_ID,
    name:               'JITO Green Legacy',
    slug:               'jito-mumbai',
    primaryColor:       '#2d5a1b',
    logoUrl:            null,
    email:              'mumbaizoneJES@jito.org',
    phone:              '+919137741905',
    address:            null,
    website:            null,
    farmerIdPrefix:     'JGL',
    donationRefPrefix:  'JITO',
    treePrice:          500,
    org80gNumber:       null,
    campaignConfig:     null,
    paymentBanks:       [],
    customDomain:       null,
    plan:               'ENTERPRISE',
    active:             true,
  };
}

// Utility: get JITO config directly (for server components, lib files)
export async function getDefaultOrgConfig(): Promise<OrgConfig> {
  return resolveTenantFromRequest(new Request('http://localhost'));
}

// Invalidate cache for an org (call after admin updates org settings)
export function invalidateOrgCache(orgId: string) {
  cache.delete(orgId);
}
