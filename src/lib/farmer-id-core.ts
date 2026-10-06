// src/lib/farmer-id-core.ts
// Issues the human-readable identifiers:
//   • Farmer ID  JGL-MH-NAS-F-007  — when an admin verifies a farmer
//   • GIS ID     JGL-MH-NAS-G-003  — when a land parcel's boundary is first captured
//
// Deliberately imports NOTHING from the app (no "@/…" aliases, no Prisma
// singleton): the Prisma client is passed in. That lets the exact same file
// be used by the app routes AND by the backfill scripts (which transpile it on
// the fly), so a backfilled ID can never be formatted differently from a live
// one. IDs are permanent — they must never be formatted two different ways.

// Existing mapping kept as-is (tree-tag.ts uses it too, so changing a code
// would change tree tags). Only addition: Delhi, which the registration form
// offers but which previously fell through to the generic "IN".
const STATE_CODES: Record<string, string> = {
  'Maharashtra': 'MH', 'Gujarat': 'GJ', 'Rajasthan': 'RJ',
  'Madhya Pradesh': 'MP', 'Karnataka': 'KA', 'Tamil Nadu': 'TN',
  'Kerala': 'KL', 'Andhra Pradesh': 'AP', 'Telangana': 'TG',
  'Uttar Pradesh': 'UP', 'Goa': 'GA', 'Punjab': 'PB', 'Delhi': 'DL',
};
const STATE_LOOKUP = new Map(Object.entries(STATE_CODES).map(([k, v]) => [k.toLowerCase(), v]));

export function stateCode(state?: string | null): string {
  return STATE_LOOKUP.get((state || '').trim().toLowerCase()) || 'IN';
}

// Latin letters only. A district written in Devanagari used to produce an
// EMPTY code (an ID like "JGL-MH--F-001"); it now falls back to "XX".
export function districtCode(district?: string | null): string {
  const c = (district || '').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3);
  return c || 'XX';
}

export function normalizePrefix(prefix?: string | null): string {
  return (prefix || '').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'BNZ';
}

export function counterKey(prefix: string, state: string, district: string): string {
  return `${prefix}-${state}-${district}`;
}

export type IdLetter = 'F' | 'G';

// 001…999, then 1000+ naturally.
export function formatSequenceId(base: string, letter: IdLetter, seq: number): string {
  return `${base}-${letter}-${String(seq).padStart(3, '0')}`;
}
export const formatFarmerId = (base: string, seq: number) => formatSequenceId(base, 'F', seq);
export const formatGisId = (base: string, seq: number) => formatSequenceId(base, 'G', seq);

// Farmer IDs keep the original, unsuffixed counter row (so nothing already
// issued or planned shifts); GIS IDs get their own sequence.
const counterRow = (base: string, letter: IdLetter) => (letter === 'F' ? base : `${base}-${letter}`);

export type AssignResult = {
  id: string | null;
  assigned: boolean;          // true only if THIS call issued it
  locationFallback?: boolean; // district unknown → "XX" in the ID
  reason?: string;
};

// ── Shared, race-safe issuing ────────────────────────────────────────────
class AlreadyAssigned extends Error {}

async function issueSequentialId(prisma: any, o: {
  base: string; letter: IdLetter;
  current: (db: any) => Promise<string | null>;                // the ID already on the record, if any
  isTaken: (tx: any, id: string) => Promise<boolean>;          // candidate already used (hand-assigned)?
  assign: (tx: any, id: string) => Promise<number>;            // conditional write; returns rows changed
}): Promise<{ id: string | null; assigned: boolean }> {
  try {
    return await prisma.$transaction(async (tx: any) => {
      // Re-check inside the transaction: another request may have issued it
      // between the caller's read and now.
      const existing = await o.current(tx);
      if (existing) return { id: existing, assigned: false };

      for (let attempt = 0; attempt < 50; attempt++) {
        // ONE statement does the increment: atomic, and concurrent callers
        // for the same key queue on the row lock — never read-then-write.
        const key = counterRow(o.base, o.letter);
        const rows = await tx.$queryRaw`
          INSERT INTO farmer_id_counters ("counterKey", "lastValue") VALUES (${key}, 1)
          ON CONFLICT ("counterKey") DO UPDATE SET "lastValue" = farmer_id_counters."lastValue" + 1
          RETURNING "lastValue"`;
        const candidate = formatSequenceId(o.base, o.letter, Number(rows[0].lastValue));

        // Skip a number that was assigned by hand/out-of-band already.
        if (await o.isTaken(tx, candidate)) continue;

        // Conditional write: only succeeds if no ID has been set yet.
        if ((await o.assign(tx, candidate)) === 0) throw new AlreadyAssigned(); // lost a race → roll back our bump
        return { id: candidate, assigned: true };
      }
      throw new Error(`Could not allocate a unique ${o.letter}-ID for ${o.base}`);
    }, { maxWait: 5000, timeout: 15000 });
  } catch (e) {
    if (e instanceof AlreadyAssigned) return { id: await o.current(prisma), assigned: false };
    throw e;
  }
}

// Pure preview of what would be issued, in order, given the current counters
// and the IDs already in use. Mirrors the real allocation loop (increment,
// skip numbers already taken). Used by the backfill dry runs.
function planSequential(items: any[], derive: (item: any) => { key: string; locationFallback: boolean },
  letter: IdLetter, counters: Record<string, number>, taken: Set<string>) {
  const c = { ...counters };
  const used = new Set(taken);
  return items.map(item => {
    const { key, locationFallback } = derive(item);
    const row = counterRow(key, letter);
    let id: string;
    do { c[row] = (c[row] || 0) + 1; id = formatSequenceId(key, letter, c[row]); } while (used.has(id));
    used.add(id);
    return { item, id, locationFallback };
  });
}

async function audit(prisma: any, farmerId: string | null, actor: any, action: string, details: any) {
  await prisma.auditLog.create({
    data: { farmerId, actorRole: actor?.role || 'SYSTEM', actorId: actor?.id, action, details },
  }).catch(() => {});
}

// ── Farmer ID ────────────────────────────────────────────────────────────
// Which counter a farmer's ID comes from. The farmer's own address first,
// then their land's — district isn't a required registration field, so many
// farmers only have it on the land record.
export function deriveFarmerIdKey(farmer: any): { key: string; locationFallback: boolean } {
  const lands: any[] = farmer.lands || [];
  const district = farmer.district || lands.find(l => l.district)?.district || null;
  const state = farmer.state || lands.find(l => l.state)?.state || null;
  return {
    key: counterKey(normalizePrefix(farmer.organization?.farmer_id_prefix), stateCode(state), districtCode(district)),
    locationFallback: districtCode(district) === 'XX',
  };
}

export function planFarmerIds(farmers: any[], counters: Record<string, number>, taken: Set<string>) {
  return planSequential(farmers, deriveFarmerIdKey, 'F', counters, taken)
    .map(p => ({ farmer: p.item, id: p.id, locationFallback: p.locationFallback }));
}

// Idempotent and race-safe. An ID, once issued, is never changed or reissued.
export async function assignFarmerIdWith(
  prisma: any, farmerId: string, actor?: { role?: string; id?: string },
): Promise<AssignResult> {
  const farmer = await prisma.farmer.findUnique({
    where: { id: farmerId },
    select: {
      id: true, farmerIdGenerated: true, state: true, district: true,
      organization: { select: { farmer_id_prefix: true } },
      lands: { select: { state: true, district: true }, orderBy: { createdAt: 'asc' }, take: 5 },
    },
  });
  if (!farmer) return { id: null, assigned: false, reason: 'FARMER_NOT_FOUND' };
  if (farmer.farmerIdGenerated) return { id: farmer.farmerIdGenerated, assigned: false };

  const { key, locationFallback } = deriveFarmerIdKey(farmer);
  const r = await issueSequentialId(prisma, {
    base: key, letter: 'F',
    current: async db => (await db.farmer.findUnique({ where: { id: farmerId }, select: { farmerIdGenerated: true } }))?.farmerIdGenerated ?? null,
    isTaken: async (tx, id) => !!(await tx.farmer.findUnique({ where: { farmerIdGenerated: id }, select: { id: true } })),
    assign: async (tx, id) => (await tx.farmer.updateMany({ where: { id: farmerId, farmerIdGenerated: null }, data: { farmerIdGenerated: id } })).count,
  });
  if (!r.assigned) return { id: r.id, assigned: false };
  await audit(prisma, farmerId, actor, 'FARMER_ID_ISSUED', { farmerIdGenerated: r.id, ...(locationFallback ? { locationFallback: true } : {}) });
  return { id: r.id, assigned: true, locationFallback };
}

// ── GIS ID (one per land parcel) ─────────────────────────────────────────
// "Captured" means a real ring of at least 3 points — exactly the test every
// map in the app uses before drawing a polygon. A null, an empty object, or a
// 2-point line is NOT a boundary and must not get an ID.
export function hasBoundary(polygon: any): boolean {
  const ring = polygon?.coordinates?.[0];
  return Array.isArray(ring) && ring.length >= 3;
}

// A GIS ID names the parcel's own location, so the parcel's state/district come
// first; the farmer's are only a fallback.
export function deriveGisIdKey(land: any): { key: string; locationFallback: boolean } {
  const f = land.farmer || {};
  const district = land.district || f.district || null;
  const state = land.state || f.state || null;
  return {
    key: counterKey(normalizePrefix(f.organization?.farmer_id_prefix), stateCode(state), districtCode(district)),
    locationFallback: districtCode(district) === 'XX',
  };
}

export function planGisIds(lands: any[], counters: Record<string, number>, taken: Set<string>) {
  return planSequential(lands, deriveGisIdKey, 'G', counters, taken)
    .map(p => ({ land: p.item, id: p.id, locationFallback: p.locationFallback }));
}

// Issued the first time a parcel's boundary exists; idempotent; the ID never
// changes afterwards (even if the boundary is later replaced).
export async function assignLandGisIdWith(
  prisma: any, landId: string, actor?: { role?: string; id?: string },
): Promise<AssignResult> {
  const land = await prisma.land.findUnique({
    where: { id: landId },
    select: {
      id: true, gisId: true, state: true, district: true, polygonGeoJson: true, farmerId: true,
      farmer: { select: { state: true, district: true, organization: { select: { farmer_id_prefix: true } } } },
    },
  });
  if (!land) return { id: null, assigned: false, reason: 'LAND_NOT_FOUND' };
  if (land.gisId) return { id: land.gisId, assigned: false };
  if (!hasBoundary(land.polygonGeoJson)) return { id: null, assigned: false, reason: 'NO_BOUNDARY' };

  const { key, locationFallback } = deriveGisIdKey(land);
  const r = await issueSequentialId(prisma, {
    base: key, letter: 'G',
    current: async db => (await db.land.findUnique({ where: { id: landId }, select: { gisId: true } }))?.gisId ?? null,
    isTaken: async (tx, id) => !!(await tx.land.findUnique({ where: { gisId: id }, select: { id: true } })),
    assign: async (tx, id) => (await tx.land.updateMany({ where: { id: landId, gisId: null }, data: { gisId: id } })).count,
  });
  if (!r.assigned) return { id: r.id, assigned: false };
  await audit(prisma, land.farmerId, actor, 'GIS_ID_ISSUED', { landId, gisId: r.id, ...(locationFallback ? { locationFallback: true } : {}) });
  return { id: r.id, assigned: true, locationFallback };
}
