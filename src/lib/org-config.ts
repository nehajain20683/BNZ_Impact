// src/lib/org-config.ts
// Central helper to get org config for use in lib files (pdf, email, templates)
// Falls back to JITO defaults so existing behaviour is unchanged

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

// JITO defaults — used when no org is specified or org not found
export const JITO_DEFAULTS: OrgBranding = {
  name:               'JITO Green Legacy — Mumbai Zone',
  email:              'mumbaizoneJES@jito.org',
  phone:              '+91 91377 41905',
  address:            'Mumbai, Maharashtra',
  farmerIdPrefix:     'JGL',
  donationRefPrefix:  'JITO',
  treePrice:          500,
  org80gNumber:       '',
  paymentBanks: [
    { name: 'Bank of Ghatkopar', account: '0054713345', holder: 'JITO Ghatkopar Chapter Foundation Youth Wing' },
    { name: 'Bank of Goregaon',  account: '7246812022', holder: 'JITO Mumbai Goregaon Chapter Foundation Mumbai Zone' },
  ],
  primaryColor: '#2d5a1b',
  logoUrl:      null,
};

// Convert raw org DB record to OrgBranding
export function orgTobranding(org: any): OrgBranding {
  return {
    name:               org.name              || JITO_DEFAULTS.name,
    email:              org.email             || JITO_DEFAULTS.email,
    phone:              org.phone             || JITO_DEFAULTS.phone,
    address:            org.address           || JITO_DEFAULTS.address,
    farmerIdPrefix:     org.farmer_id_prefix  || JITO_DEFAULTS.farmerIdPrefix,
    donationRefPrefix:  org.donation_ref_prefix || JITO_DEFAULTS.donationRefPrefix,
    treePrice:          org.tree_price        || JITO_DEFAULTS.treePrice,
    org80gNumber:       org.org_80g_number    || JITO_DEFAULTS.org80gNumber,
    paymentBanks:       org.payment_banks     || JITO_DEFAULTS.paymentBanks,
    primaryColor:       org.primary_color     || JITO_DEFAULTS.primaryColor,
    logoUrl:            org.logo_url          || null,
  };
}
