// src/lib/consent-context.ts
// Loads everything the consent declaration needs from the database, so the
// registration preview, the registration-time snapshot, and the admin
// "generate" action all render from the same authoritative records rather
// than from whatever a client happened to send.
import prisma from '@/lib/prisma';
import type { ConsentInput } from '@/lib/consent-declaration';

export async function loadConsentInput(farmerId: string, opts: { landId?: string | null; orgId?: string } = {}) {
  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, ...(opts.orgId ? { orgId: opts.orgId } : {}) },
    include: { lands: { orderBy: { createdAt: 'asc' } }, organization: true },
  });
  if (!farmer) return null;

  // One declaration describes one specific parcel (same rule as every other
  // agreement type) — the requested land, else the farmer's first.
  const land = (opts.landId ? farmer.lands.find(l => l.id === opts.landId) : null) || farmer.lands[0] || null;
  const signatory = await prisma.orgSignatory.findFirst({ where: { orgId: farmer.orgId, isPrimary: true } });
  const org: any = farmer.organization;

  const input: ConsentInput = {
    farmer: {
      fullName: farmer.fullName, fatherName: farmer.fatherName, mobile: farmer.mobile,
      aadhaarNumber: farmer.aadhaarNumber, village: farmer.village, taluka: farmer.taluka,
      district: farmer.district, state: farmer.state, pincode: farmer.pincode,
    },
    land: land ? { surveyGutNumber: land.surveyGutNumber, village: land.village, taluka: land.taluka, district: land.district } : null,
    org: { name: org?.name || 'BNZ Impact', logoUrl: org?.logo_url || null, email: org?.email || null, consentAuthorityName: org?.consent_authority_name || null },
    authorityRep: signatory ? { name: signatory.name, designation: signatory.designation } : null,
  };
  return { farmer, land, input };
}
