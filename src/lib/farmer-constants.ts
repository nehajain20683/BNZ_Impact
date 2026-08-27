// src/lib/farmer-constants.ts
// A Farmer is one entity that can own many Land parcels. These two
// lifecycles are tracked separately:
//   - Farmer-level: identity/bank documents → drives farmer.status
//   - Land-level: per-parcel documents → drives that Land's own `verified` flag
// Mixing these into one list (as the old flat document page did) makes it
// impossible to tell which land a document belongs to once a farmer has more
// than one parcel — this file is the single source of truth for the split.

export const FARMER_DOC_TYPES = [
  { key: 'AADHAAR', label: 'Aadhaar Card', required: true, accept: 'image/*,application/pdf', hint: 'Front and back of Aadhaar card' },
  { key: 'PAN',      label: 'PAN Card',     required: false, accept: 'image/*,application/pdf', hint: 'PAN card for 80G tax benefit' },
  { key: 'CANCELLED_CHEQUE', label: 'Cancelled Cheque', required: false, accept: 'image/*,application/pdf', hint: 'For bank account verification' },
] as const;

export const LAND_DOC_TYPES = [
  { key: 'LAND_7_12',       label: '7/12 Extract',      required: true,  accept: 'image/*,application/pdf', hint: 'Satbara Utara / Land Record extract' },
  { key: 'LAND_RECORD',     label: 'Land Record',       required: true,  accept: 'image/*,application/pdf', hint: 'Official land ownership record' },
  { key: 'OWNERSHIP_PROOF', label: 'Ownership Proof',   required: true,  accept: 'image/*,application/pdf', hint: 'Any document proving land ownership' },
  { key: 'PROPERTY_TAX',    label: 'Property Tax Receipt', required: false, accept: 'image/*,application/pdf', hint: 'Latest property tax payment receipt' },
  { key: 'CONSENT_LETTER',  label: 'Consent Letter',    required: false, accept: 'image/*,application/pdf', hint: 'Signed consent for plantation' },
  { key: 'PLANTATION_PHOTO',label: 'Land / Site Photo', required: false, accept: 'image/*',                 hint: 'Current photo of this land' },
  { key: 'OTHER',           label: 'Google Earth / KML File', required: false, accept: '.kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz,image/*,application/pdf', hint: 'KML/KMZ boundary file for this land' },
] as const;

export const FARMER_DOC_TYPE_KEYS = FARMER_DOC_TYPES.map(d => d.key);
export const LAND_DOC_TYPE_KEYS   = LAND_DOC_TYPES.map(d => d.key);

// Ordered so "is this farmer at or beyond stage X" can be checked with a
// simple index comparison. Farmer as a *person* only has 4 real stages —
// SUSPENDED is an admin override, not a forward-progress stage.
export const FARMER_STATUS_ORDER = ['REGISTERED', 'DOCUMENTS_PENDING', 'VERIFIED_LAND_OWNER', 'SUSPENDED'];

// The stage at which a farmer's own profile becomes locked to self-edits —
// "Registered Farmer" in the product sense: personal + bank details filled,
// and their identity documents (Aadhaar at minimum) verified by admin.
export const FARMER_LOCK_STATUS = 'VERIFIED_LAND_OWNER';

// Per-land pipeline — independent for every parcel a farmer owns. Everything
// that used to live on FarmerStatus but actually describes one specific
// piece of land (inspection, approval, activation) lives here instead.
export const LAND_STATUS_ORDER = [
  'DOCUMENTS_PENDING', 'DOCUMENTS_VERIFIED', 'INSPECTION_PENDING',
  'INSPECTION_COMPLETED', 'APPROVED', 'ACTIVE',
];

// The stage at which a land parcel locks — matches the existing
// `Land.verified` semantics ("once approved, no changes").
export const LAND_LOCK_STATUS = 'APPROVED';

export function isAtOrBeyondLandStage(status: string | null | undefined, stage: string): boolean {
  const current = LAND_STATUS_ORDER.indexOf(status || 'DOCUMENTS_PENDING');
  const target  = LAND_STATUS_ORDER.indexOf(stage);
  if (current === -1 || target === -1) return false;
  return current >= target;
}

export function isAtOrBeyondStage(status: string | null | undefined, stage: string): boolean {
  const current = FARMER_STATUS_ORDER.indexOf(status || 'REGISTERED');
  const target  = FARMER_STATUS_ORDER.indexOf(stage);
  if (current === -1 || target === -1) return false;
  return current >= target;
}

// Does this farmer meet the criteria to be considered a fully "Registered
// Farmer" (person-entity complete)? Personal + bank details filled in, and
// every required farmer-level document verified.
export function isFarmerEntityComplete(farmer: any, verifiedDocTypes: Set<string>): boolean {
  const personalComplete = !!(farmer.fullName && farmer.fullName !== 'Pending' && farmer.aadhaarNumber);
  const bankComplete = !!(farmer.bankAccountName && farmer.bankName && farmer.accountNumber && farmer.ifscCode);
  const requiredDocsVerified = FARMER_DOC_TYPES
    .filter(d => d.required)
    .every(d => verifiedDocTypes.has(d.key));
  return personalComplete && bankComplete && requiredDocsVerified;
}
