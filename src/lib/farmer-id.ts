// src/lib/farmer-id.ts — Auto-generate Farmer IDs and GIS IDs
import prisma from './prisma';

const STATE_CODES: Record<string, string> = {
  'Maharashtra': 'MH', 'Gujarat': 'GJ', 'Rajasthan': 'RJ',
  'Madhya Pradesh': 'MP', 'Uttar Pradesh': 'UP', 'Karnataka': 'KA',
  'Tamil Nadu': 'TN', 'Kerala': 'KL', 'Andhra Pradesh': 'AP',
  'Telangana': 'TS', 'West Bengal': 'WB', 'Bihar': 'BR',
  'Odisha': 'OD', 'Punjab': 'PB', 'Haryana': 'HR',
};

function districtCode(district: string): string {
  // Take first 3 uppercase letters of district
  return district.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'GEN';
}

export async function generateFarmerId(state: string, district: string): Promise<string> {
  const stateCode = STATE_CODES[state] || state.slice(0, 2).toUpperCase();
  const distCode  = districtCode(district);
  const prefix    = `JGL-${stateCode}-${distCode}-F-`;

  // Count existing farmers with this prefix
  const count = await prisma.farmer.count({
    where: { farmerIdGenerated: { startsWith: prefix } }
  });
  const seq = String(count + 1).padStart(3, '0');
  return `${prefix}${seq}`;
}

export function generateGisId(farmerId: string): string {
  const ts  = Date.now().toString(36).toUpperCase();
  const ran = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `GIS-${ts}-${ran}`;
}
