export const runtime = 'nodejs';
// src/app/api/superadmin/orgs/[id]/engine-config/route.ts
// Phase 0B of the frozen dMRV architecture spec — configuration, not a
// workflow graph. GET returns the tenant's current engine type, required
// phases, and every catalog module with its enabled/disabled state for
// this org (auto-provisioning both the catalog and a default config row
// the first time either is read, so this works immediately on existing
// orgs with zero manual seeding step).
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'SUPER_ADMIN')
    throw new Error('Unauthorized');
  return session.user as any;
}

// Fixed, admin-managed catalog — the Layer 2 module list from the frozen
// spec. Adding a new module later means adding one row here, not a schema
// change, since EngineModule.key is the only thing anything references.
const MODULE_CATALOG = [
  { key: 'FARMER_REGISTRY',      label: 'Farmer Registry',       description: 'Land owner onboarding, identity + land documents' },
  { key: 'LAND_MAPPING',         label: 'Land Mapping',          description: 'GPS points and KML-parsed parcel boundaries' },
  { key: 'QR_TREES',             label: 'QR Trees',              description: 'QR tagging, bulk-scan capture' },
  { key: 'MONITORING',           label: 'Monitoring',            description: 'Health monitoring visits, survival tracking' },
  { key: 'PDD',                  label: 'Project Design Document', description: 'Registry-grade PDD authoring (Phase 0C)' },
  { key: 'BASELINE_ASSESSMENT',  label: 'Baseline Assessment',   description: 'Pre-planting land-use/vegetation baseline capture' },
  { key: 'REGISTRY_SUBMISSION',  label: 'Registry Submission',   description: 'Verra/Gold Standard/ICR submission workflow' },
  { key: 'SATELLITE_MONITORING', label: 'Satellite Monitoring',  description: 'NDVI/canopy — not built yet, reserved key' },
];

async function ensureModuleCatalog() {
  for (const m of MODULE_CATALOG) {
    await (prisma as any).engineModule.upsert({
      where: { key: m.key },
      update: { label: m.label, description: m.description },
      create: m,
    });
  }
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    await ensureModuleCatalog();

    const org = await (prisma as any).organization.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    let config = await (prisma as any).tenantEngineConfig.findUnique({ where: { orgId: params.id } });
    if (!config) {
      // Default, matching current real-world behavior for every existing
      // tenant: CSR_PLANTATION engine type, no phase enforced as
      // mandatory (identical to how every site behaves today, before
      // this phase existed at all).
      config = await (prisma as any).tenantEngineConfig.create({
        data: { orgId: params.id, engineType: 'CSR_PLANTATION', requiredPhases: [] },
      });
    }

    const modules = await (prisma as any).engineModule.findMany({ orderBy: { key: 'asc' } });
    const tenantModules = await (prisma as any).tenantModule.findMany({ where: { orgId: params.id } });
    const enabledByKey: Record<string, boolean> = {};
    for (const tm of tenantModules) enabledByKey[tm.moduleKey] = tm.enabled;

    const moduleStates = modules.map((m: any) => ({
      key: m.key, label: m.label, description: m.description,
      // Core operational modules default ON for every tenant unless
      // explicitly turned off; registry-grade modules default OFF unless
      // explicitly turned on — matches "CSR tenant never sees PDD" from
      // the frozen spec without needing a manual toggle per new org.
      enabled: enabledByKey[m.key] ?? !['PDD', 'BASELINE_ASSESSMENT', 'REGISTRY_SUBMISSION', 'SATELLITE_MONITORING'].includes(m.key),
    }));

    return NextResponse.json({ org, config, modules: moduleStates });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const body = await req.json();

    if (body.engineType || body.requiredPhases || body.defaultMonitoringIntervalDays) {
      await (prisma as any).tenantEngineConfig.upsert({
        where: { orgId: params.id },
        update: {
          ...(body.engineType ? { engineType: body.engineType } : {}),
          ...(body.requiredPhases ? { requiredPhases: body.requiredPhases } : {}),
          ...(body.defaultMonitoringIntervalDays ? { defaultMonitoringIntervalDays: body.defaultMonitoringIntervalDays } : {}),
        },
        create: {
          orgId: params.id,
          engineType: body.engineType || 'CSR_PLANTATION',
          requiredPhases: body.requiredPhases || [],
          defaultMonitoringIntervalDays: body.defaultMonitoringIntervalDays || 30,
        },
      });
    }

    if (body.moduleKey) {
      await (prisma as any).tenantModule.upsert({
        where: { orgId_moduleKey: { orgId: params.id, moduleKey: body.moduleKey } },
        update: { enabled: !!body.enabled },
        create: { orgId: params.id, moduleKey: body.moduleKey, enabled: !!body.enabled },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
