// src/lib/org-config.ts
// Central helper to get org config for use in lib files (pdf, email, templates)
// NOTE: this module is not currently imported anywhere (src/lib/tenant.ts's
// getOrgConfig() is the one actually used app-wide). Kept for potential
// future use, but scrubbed of the real JITO bank account numbers and
// tenant-specific defaults that used to live here as a silent fallback —
// see docs/BRANDING_ANALYSIS.md §2. Do not reintroduce real financial data
// as a default; an empty paymentBanks array is the correct "no config" state.

export type OrgBranding = {
  name:               string;
  email:              string;
  phone:              string;
  address:            string;
  farmerIdPrefix:     string;
  donationRefPrefix:  string;
  treePrice:          number;
  org80gNumber:       string;
  paymentBanks:       Array<{ name: string; account: string; holder: string }>;
  primaryColor:       string;
  logoUrl:            string | null;
};

// Generic platform defaults — used only when no org is specified or found
export const PLATFORM_DEFAULTS: OrgBranding = {
  name:               'BNZ Impact',
  email:              'info@bnzgreen.io',
  phone:              '',
  address:            '',
  farmerIdPrefix:     'BNZ',
  donationRefPrefix:  'BNZ',
  treePrice:          500,
  org80gNumber:       '',
  paymentBanks:       [],
  primaryColor:       '#2d5a1b',
  logoUrl:            null,
};

// Convert raw org DB record to OrgBranding
export function orgTobranding(org: any): OrgBranding {
  return {
    name:               org.name              || PLATFORM_DEFAULTS.name,
    email:              org.email             || PLATFORM_DEFAULTS.email,
    phone:              org.phone             || PLATFORM_DEFAULTS.phone,
    address:            org.address           || PLATFORM_DEFAULTS.address,
    farmerIdPrefix:     org.farmer_id_prefix  || PLATFORM_DEFAULTS.farmerIdPrefix,
    donationRefPrefix:  org.donation_ref_prefix || PLATFORM_DEFAULTS.donationRefPrefix,
    treePrice:          org.tree_price        || PLATFORM_DEFAULTS.treePrice,
    org80gNumber:       org.org_80g_number    || PLATFORM_DEFAULTS.org80gNumber,
    paymentBanks:       org.payment_banks     || PLATFORM_DEFAULTS.paymentBanks,
    primaryColor:       org.primary_color     || PLATFORM_DEFAULTS.primaryColor,
    logoUrl:            org.logo_url          || null,
  };
}
