// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateReceiptNumber(prefix: string = 'BNZ'): string {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${year}${random}`;
}

export function calculateCO2(trees: number): number {
  return trees * 22;
}

// NOTE: a hardcoded `BRAND` constant (name/tagline/org/email/phone) used to
// live here. It has been removed — every consumer now sources branding from
// the tenant via useOrgConfig() (client) or resolveTenantFromRequest()
// (server), per docs/BRANDING_ANALYSIS.md. Do not reintroduce a hardcoded
// brand object; add fields to the Organization model + OrgConfig type instead.

export const NATURE_IMAGES = {
  hero:        'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1400&q=85&auto=format',
  tree1:       'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&q=80&auto=format',
  tree2:       'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80&auto=format',
  plantation:  'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80&auto=format',
  community:   'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80&auto=format',
  aerial:      'https://images.unsplash.com/photo-1476231682828-37e571bc172f?w=800&q=80&auto=format',
  nature1:     'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80&auto=format',
  nature2:     'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format',
  leaves:      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80&auto=format',
};

// Images for the "Why We Want to Plant" section — using uploaded custom images
export const WHY_PLANT_IMAGES = {
  environmental: '/why/environmental.png',
  legacy:        '/why/legacy.png',
  community:     '/why/community.png',
  future:        '/why/future.png',
  spiritual:     '/why/spiritual.png',
  transparent:   '/why/geotag.png',
};

// Campaign categories
export const CAMPAIGNS = [
  {
    slug: 'dadi',
    name: 'Ek Ped Dadi Ke Naam',
    shortName: 'Dadi',
    subtitle: 'In Honour of Your Grandmother',
    description: 'Plant trees in honour of your grandmother — a tribute as enduring as her wisdom, blessings, and unconditional love.',
    image: '/campaigns/dadi.png',
    accentColor: '#92400e',
    accentBg: '#fffbeb',
    accentBorder: '#fde68a',
    gradient: 'from-amber-800 to-amber-950',
  },
  {
    slug: 'maa',
    name: 'Ek Ped Maa Ke Naam',
    shortName: 'Maa',
    subtitle: 'In Honour of Your Mother',
    description: 'Honour your mother with a living legacy. A tree that grows in her name, standing tall through every season.',
    image: '/campaigns/maa.png',
    accentColor: '#9d174d',
    accentBg: '#fff1f2',
    accentBorder: '#fecdd3',
    gradient: 'from-rose-700 to-rose-950',
  },
  {
    slug: 'beti',
    name: 'Ek Ped Beti Ke Naam',
    shortName: 'Beti',
    subtitle: 'In Honour of Your Daughter',
    description: 'Celebrate your daughter with a tree that grows as she does — rooted, resilient, and reaching for the sky.',
    image: '/campaigns/beti.png',
    accentColor: '#831843',
    accentBg: '#fdf2f8',
    accentBorder: '#f9a8d4',
    gradient: 'from-pink-700 to-pink-950',
  },
  {
    slug: 'poti',
    name: 'Ek Ped Poti Ke Naam',
    shortName: 'Poti',
    subtitle: 'In Honour of Your Granddaughter',
    description: 'Gift your granddaughter a forest of possibilities — a green inheritance she will walk through for generations.',
    image: '/campaigns/poti.png',
    accentColor: '#4c1d95',
    accentBg: '#faf5ff',
    accentBorder: '#d8b4fe',
    gradient: 'from-violet-700 to-violet-950',
  },
];

// Package options — ₹500 per tree
export const CAMPAIGN_PACKAGES = [
  { id: 'pkg-108', trees: 108, price: 54000, badge: 'विरासत निर्माता', badgeEn: 'Diamond Legacy', emoji: '💎', popular: false, description: 'The sacred 108 — create an entire forest in her name.' },
  { id: 'pkg-54',  trees: 54,  price: 27000, badge: 'समर्पित',         badgeEn: 'Platinum Legacy', emoji: '🏆', popular: true,  description: 'A thriving grove that will outlast generations.' },
  { id: 'pkg-27',  trees: 27,  price: 13500, badge: 'संकल्पी',          badgeEn: 'Gold Legacy',    emoji: '🥇', popular: false, description: 'The auspicious number — a micro-forest of meaning.' },
  { id: 'pkg-11',  trees: 11,  price: 5500,  badge: 'प्रेरक',           badgeEn: 'Silver Legacy',  emoji: '🥈', popular: false, description: 'Eleven trees — one for every blessing she has given.' },
];

export const INDIVIDUAL_TREE_PRICE = 500;

export const DEDICATION_TYPES = [
  { value: 'DADI',       label: 'Dadi (Grandmother)' },
  { value: 'MAA',        label: 'Maa (Mother)' },
  { value: 'BETI',       label: 'Beti (Daughter)' },
  { value: 'POTI',       label: 'Poti (Granddaughter)' },
  { value: 'INDIVIDUAL', label: 'Individual Purchase' },
];
