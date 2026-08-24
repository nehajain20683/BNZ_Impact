// src/lib/farmer-id.ts
// Generates farmer IDs using each org's configured prefix
// Format: {PREFIX}-{STATE_CODE}-{DISTRICT_CODE}-F-{NUMBER}
// Example: BNZ-MH-THA-F-001, or ROT-MH-THA-F-001 for a "ROT"-prefixed tenant

import prisma from '@/lib/prisma';

const STATE_CODES: Record<string, string> = {
  'Maharashtra': 'MH', 'Gujarat': 'GJ', 'Rajasthan': 'RJ',
  'Madhya Pradesh': 'MP', 'Karnataka': 'KA', 'Tamil Nadu': 'TN',
  'Kerala': 'KL', 'Andhra Pradesh': 'AP', 'Telangana': 'TG',
  'Uttar Pradesh': 'UP', 'Goa': 'GA', 'Punjab': 'PB',
};

function stateCode(state?: string | null): string {
  return STATE_CODES[state || ''] || 'IN';
}

function districtCode(district?: string | null): string {
  if (!district) return 'XX';
  return district.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3);
}

export async function generateFarmerId(
  farmerId: string,
  state?: string | null,
  district?: string | null,
  orgId?: string | null
): Promise<string> {
  // Get org prefix — generic default if the org has none configured
  let prefix = 'BNZ';
  if (orgId) {
    try {
      const org = await (prisma as any).organization.findUnique({
        where: { id: orgId },
        select: { farmer_id_prefix: true },
      });
      if (org?.farmer_id_prefix) prefix = org.farmer_id_prefix;
    } catch {}
  }

  const sc   = stateCode(state);
  const dc   = districtCode(district);
  const seq  = farmerId.slice(-3).replace(/[^0-9]/g, '').padStart(3, '0') || '001';

  return `${prefix}-${sc}-${dc}-F-${seq}`;
}

// Synchronous version with explicit prefix (for use when org is already loaded)
export function generateFarmerIdSync(
  farmerId: string,
  state?: string | null,
  district?: string | null,
  prefix: string = 'BNZ'
): string {
  const sc  = stateCode(state);
  const dc  = districtCode(district);
  const seq = farmerId.slice(-3).replace(/[^0-9]/g, '').padStart(3, '0') || '001';
  return `${prefix}-${sc}-${dc}-F-${seq}`;
}
