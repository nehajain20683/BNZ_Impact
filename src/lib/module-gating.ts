// src/lib/module-gating.ts
// Extracted from registry-readiness/route.ts and the Phase 0B engine-
// config route, both of which had their own copy of this exact check —
// one shared version now, so a module's default-enabled behavior can
// never disagree between call sites.
import prisma from '@/lib/prisma';

// PDD, BASELINE_ASSESSMENT, REGISTRY_SUBMISSION, and SATELLITE_MONITORING
// default OFF for every org — registry pursuit is opt-in, not assumed.
// Everything else defaults ON (the core operational modules every
// tenant needs from day one).
const DEFAULT_OFF_MODULES = ['PDD', 'BASELINE_ASSESSMENT', 'REGISTRY_SUBMISSION', 'SATELLITE_MONITORING'];

export async function moduleEnabled(orgId: string, moduleKey: string): Promise<boolean> {
  const row = await (prisma as any).tenantModule.findUnique({ where: { orgId_moduleKey: { orgId, moduleKey } } });
  if (row) return row.enabled;
  return !DEFAULT_OFF_MODULES.includes(moduleKey);
}
