// src/lib/tree-tag.ts
// Generates unique Tree Tag IDs at the moment a donated tree is linked to a
// real farmer's land (via "Link Sponsored Trees") — that's the first point
// a tree has an actual location, so it's the natural point it gets an
// identity. System-generated, never manually typed, to avoid typos/duplicates.
//
// Format: {ORG_PREFIX}-{STATE}-{DISTRICT}-T-{SEQUENCE}
// Example: BNZ-MH-THA-T-00001
//
// Unlike Farmer IDs (which derive their sequence from characters in the
// farmer's own cuid — a pattern with real collision risk since cuids aren't
// numeric), tree sequences are a genuine incrementing count of how many
// tagged trees already exist in that org+state+district scope, so numbers
// are dense and predictable.
import prisma from '@/lib/prisma';
import { stateCode, districtCode } from '@/lib/farmer-id';

async function getOrgPrefix(orgId?: string | null): Promise<string> {
  if (!orgId) return 'BNZ';
  try {
    const org = await (prisma as any).organization.findUnique({
      where: { id: orgId },
      select: { farmer_id_prefix: true },
    });
    return org?.farmer_id_prefix || 'BNZ';
  } catch {
    return 'BNZ';
  }
}

// Generates `count` unique tree tag IDs for the given org/state/district
// scope in one go — used when batch-linking N trees at once. Sequence
// numbers are consecutive, continuing from however many tagged trees
// already exist in that exact scope.
export async function generateTreeTagIds(
  count: number,
  orgId?: string | null,
  state?: string | null,
  district?: string | null,
): Promise<string[]> {
  const prefix = await getOrgPrefix(orgId);
  const sc = stateCode(state);
  const dc = districtCode(district);
  const scopePrefix = `${prefix}-${sc}-${dc}-T-`;

  const existingCount = await prisma.tree.count({
    where: { treeTagId: { startsWith: scopePrefix } },
  });

  const tags: string[] = [];
  for (let i = 0; i < count; i++) {
    const seq = String(existingCount + i + 1).padStart(5, '0');
    tags.push(`${scopePrefix}${seq}`);
  }
  return tags;
}
