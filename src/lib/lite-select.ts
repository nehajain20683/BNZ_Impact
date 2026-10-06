// src/lib/lite-select.ts
// Egress control. Supabase bills every byte that leaves the database (the app
// reads through the pooler, so every byte a query pulls out is "egress").
// This app stores photos, ID documents and signed PDFs as base64 text IN the
// database, so a query that returns a whole row quietly drags megabytes along
// even when the caller only wanted a name or a status.
//
// selectExcept('Farmer', ['photo']) = "every scalar column of Farmer EXCEPT
// photo". It is built from Prisma's own field list, so the result has exactly
// the shape of a plain findUnique() minus the heavy columns, and it keeps
// working as columns are added — no caller needs to know which fields exist.
import { Prisma } from '@prisma/client';

const cache: Record<string, Record<string, true>> = {};

export function selectExcept(model: string, omit: string[]): Record<string, true> {
  const key = `${model}:${omit.join(',')}`;
  if (cache[key]) return cache[key];
  const fields = (Prisma as any)[`${model}ScalarFieldEnum`];
  if (!fields) throw new Error(`selectExcept: unknown model "${model}"`);
  const out: Record<string, true> = {};
  for (const f of Object.keys(fields)) if (!omit.includes(f)) out[f] = true;
  return (cache[key] = out);
}

// The heavy columns, by model. Anything that really needs the file asks for it
// explicitly (or goes through one of the on-demand file endpoints).
export const OFFICER_LITE   = selectExcept('FieldOfficer',   ['signatureImage']);
export const FARMER_LITE    = selectExcept('Farmer',         ['photo']);
export const DOCUMENT_LITE  = selectExcept('FarmerDocument', ['fileUrl']);
export const LAND_LITE      = selectExcept('Land',           ['photos']);
export const AGREEMENT_LITE = selectExcept('FarmerAgreement', ['generatedHtml', 'signedPdfUrl']);
export const CAMPAIGN_CARD  = selectExcept('Campaign',      ['galleryImages']);

// Which of these agreements have a signed copy — answered without transferring
// the copy itself (an existence check, not a read of the file).
export async function signedCopyIds(prisma: any, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await prisma.farmerAgreement.findMany({
    where: { id: { in: ids }, signedPdfUrl: { not: null } }, select: { id: true },
  });
  return new Set(rows.map((r: any) => r.id));
}
