// src/lib/farmer-id.ts
// App-side entry point for farmer and GIS IDs. The logic lives in
// farmer-id-core.ts (shared with the backfill scripts); this just binds it to
// the app's Prisma client.
//   Farmer ID  {PREFIX}-{STATE}-{DISTRICT}-F-{NNN}  e.g. JGL-MH-NAS-F-007  (at admin verification)
//   GIS ID     {PREFIX}-{STATE}-{DISTRICT}-G-{NNN}  e.g. JGL-MH-NAS-G-003  (when a parcel's boundary is captured)
//
// The previous generateFarmerId()/generateFarmerIdSync() are gone: nothing
// called them, and their "sequence" was the last 3 characters of a random id
// with the letters stripped — not a counter, so it would have produced
// duplicates against the unique column.
import prisma from '@/lib/prisma';
import { assignFarmerIdWith, assignLandGisIdWith } from '@/lib/farmer-id-core';

export { stateCode, districtCode } from '@/lib/farmer-id-core'; // tree-tag.ts imports these

type Actor = { role?: string; id?: string };
export const assignFarmerId = (farmerId: string, actor?: Actor) => assignFarmerIdWith(prisma, farmerId, actor);
export const assignLandGisId = (landId: string, actor?: Actor) => assignLandGisIdWith(prisma, landId, actor);
