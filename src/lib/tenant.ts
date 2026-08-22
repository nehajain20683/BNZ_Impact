// src/lib/tenant.ts
// Tenant resolution — determines which org a request belongs to
// Resolution order:
//   1. TENANT_SLUG env variable (set per Vercel project) ← primary
//   2. x-org-id header
//   3. Custom domain match
//   4. Subdomain match
//   5. Default → BNZ (fallback for localhost/dev)
import prisma from '@/lib/prisma';

export type OrgConfig = {
  id:                 string;
  name:               string;
  slug:               string;
  primaryColor:       string;
  logoUrl:            string | null;
  email:              string | null;
  phone:              string | null;
  address:            string | null;
  website:            string | null;
  farmerIdPrefix:     string;
  donationRefPrefix:  string;
  treePrice:          number;
  org80gNumber:       string | null;
  campaignConfig:     any;
  paymentBanks:       any[];
  customDomain:       string | null;
  plan:               string;
  active:             boolean;
};

const cache = new Map<string, { config: OrgConfig; fetchedAt: number }>();
const CACHE_TTL_MS  = 60_000;
const DEFAULT_ORG_ID = 'bnz-green'; // resolved by slug via getOrgBySlug

export async function getOrgConfig(orgId: string): Promise<OrgConfig | null> {
  const cached = cache.get(orgId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.config;

  try {
    const org = await (prisma as any).organization.findUnique({ where: { id: orgId } });
    if (!org) return null;

    const config: OrgConfig = {
      id:                org.id,
      name:              org.name,
      slug:              org.slug,
      primaryColor:      org.primary_color       || '#2d5a1b',
      logoUrl:           org.logo_url            || null,
      email:             org.email               || null,
      phone:             org.phone               || null,
      address:           org.address             || null,
      website:           org.website             || null,
      farmerIdPrefix:    org.farmer_id_prefix    || 'JGL',
      donationRefPrefix: org.donation_ref_prefix || 'JGL',
      treePrice:         org.tree_price          || 500,
      org80gNumber:      org.org_80g_number      || null,
      campaignConfig:    org.campaign_config     || null,
      paymentBanks:      org.payment_banks       || [],
      customDomain:      org.custom_domain       || null,
      plan:              org.plan                || 'STARTER',
      active:            org.active              ?? true,
    };

    cache.set(orgId, { config, fetchedAt: Date.now() });
    return config;
  } catch { return null; }
}

async function getOrgBySlug(slug: string): Promise<OrgConfig | null> {
  try {
    const org = await (prisma as any).organization.findUnique({ where: { slug } });
    if (!org) return null;
    return getOrgConfig(org.id);
  } catch { return null; }
}

async function getOrgByDomain(domain: string): Promise<OrgConfig | null> {
  try {
    const org = await (prisma as any).organization.findUnique({ where: { custom_domain: domain } });
    if (!org) return null;
    return getOrgConfig(org.id);
  } catch { return null; }
}

export async function resolveTenantFromRequest(req: Request): Promise<OrgConfig> {
  // 1. TENANT_SLUG env variable — set per Vercel project
  const envSlug = process.env.TENANT_SLUG;
  if (envSlug && envSlug !== 'superadmin') {
    const org = await getOrgBySlug(envSlug);
    if (org) return org;
  }

  // 2. x-org-id header
  const headerOrgId = req.headers.get('x-org-id');
  if (headerOrgId) {
    const org = await getOrgConfig(headerOrgId);
    if (org) return org;
  }

  // 3. Host-based resolution
  const hostname = (req.headers.get('host') || '').split(':')[0];
  if (hostname && hostname !== 'localhost') {
    const byDomain = await getOrgByDomain(hostname);
    if (byDomain) return byDomain;

    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const bySubdomain = await getOrgBySlug(parts[0]);
      if (bySubdomain) return bySubdomain;
    }
  }

  // 4. Default → BNZ (lookup by slug)
  const fallback = await getOrgBySlug(DEFAULT_ORG_ID);
  return fallback || {
    id: 'org_bnz_green', name: 'BNZ Impact', slug: 'bnz-green',
    primaryColor: '#059669', logoUrl: null, email: 'info@bnzgreen.io',
    phone: '+919372989074', address: null, website: 'https://bnzgreen.io',
    farmerIdPrefix: 'BNZ', donationRefPrefix: 'BNZ', treePrice: 500,
    org80gNumber: null, campaignConfig: null, paymentBanks: [],
    customDomain: null, plan: 'ENTERPRISE', active: true,
  };
}

export async function getDefaultOrgConfig(): Promise<OrgConfig> {
  return resolveTenantFromRequest(new Request('http://localhost'));
}

export function invalidateOrgCache(orgId: string) {
  cache.delete(orgId);
}
