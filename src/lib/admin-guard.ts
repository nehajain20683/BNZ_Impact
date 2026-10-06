// src/lib/admin-guard.ts
// One place that answers: "is the caller an admin, and does THIS resource
// belong to THEIR organisation?" Several /api/admin routes keyed by an ID in
// the URL used to skip that (some even skipped the login check on GET). The
// middleware does not cover /api, so each route must enforce this itself.
//
// Returns the admin context on success, or a ready-to-return Response.
// A resource in another org is reported as 404, not 403 — we don't confirm
// that an ID exists to someone who has no business knowing.
//
//   const scope = await guardSite(params.id);
//   if (scope instanceof Response) return scope;
//   // scope.orgId / scope.user are now trustworthy
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';

export type AdminScope = { orgId: string; user: any };

const deny = (status: number, error: string) => NextResponse.json({ error }, { status });

async function adminScope(): Promise<AdminScope | Response> {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return deny(401, 'Unauthorized');
  // ADMIN → always their own org (cookie ignored); SUPER_ADMIN → active-org cookie.
  return { orgId: await getActiveOrgId(), user };
}

export async function guardSite(siteId: string): Promise<AdminScope | Response> {
  const s = await adminScope(); if (s instanceof Response) return s;
  const row = await prisma.plantationSite.findFirst({ where: { id: siteId, orgId: s.orgId }, select: { id: true } });
  return row ? s : deny(404, 'Site not found in this organisation');
}

// Same shape as parse-kml: a land is in the org of its farmer (Land.orgId can
// be null on older rows; the farmer's orgId is always present).
export async function guardLand(landId: string): Promise<AdminScope | Response> {
  const s = await adminScope(); if (s instanceof Response) return s;
  const row = await prisma.land.findFirst({ where: { id: landId, farmer: { orgId: s.orgId } }, select: { id: true } });
  return row ? s : deny(404, 'Land not found in this organisation');
}

// Same shape as assign-trees / assign-species / tree-tags: via its site.
export async function guardAssignment(assignmentId: string): Promise<AdminScope | Response> {
  const s = await adminScope(); if (s instanceof Response) return s;
  const row = await prisma.landAssignment.findFirst({ where: { id: assignmentId, site: { orgId: s.orgId } }, select: { id: true } });
  return row ? s : deny(404, 'Assignment not found in this organisation');
}

export async function guardFarmerDocument(docId: string): Promise<AdminScope | Response> {
  const s = await adminScope(); if (s instanceof Response) return s;
  const row = await prisma.farmerDocument.findFirst({ where: { id: docId, farmer: { orgId: s.orgId } }, select: { id: true } });
  return row ? s : deny(404, 'Document not found in this organisation');
}

// ── Secondary IDs. A guard on the URL's ID is not enough when the handler
// also acts on an ID from the body/query ("delete document X", "assign farmer
// Y"): an attacker would pass their OWN site in the URL and a victim's ID in
// the body. These confirm each such ID belongs where the handler assumes. ──
export const farmerInOrg = async (id: string, orgId: string) =>
  !!(await prisma.farmer.findFirst({ where: { id, orgId }, select: { id: true } }));
export const landOfFarmer = async (landId: string, farmerId: string) =>
  !!(await prisma.land.findFirst({ where: { id: landId, farmerId }, select: { id: true } }));
export const assignmentOfSite = async (assignmentId: string, siteId: string) =>
  !!(await prisma.landAssignment.findFirst({ where: { id: assignmentId, siteId }, select: { id: true } }));
export const siteDocumentOfSite = async (docId: string, siteId: string) =>
  !!(await prisma.siteDocument.findFirst({ where: { id: docId, siteId }, select: { id: true } }));
// "Officer" may be an admin User or a FieldOfficer (the app resolves either).
export const officerInOrg = async (id: string, orgId: string) =>
  !!(await prisma.fieldOfficer.findFirst({ where: { id, orgId }, select: { id: true } })) ||
  !!(await prisma.user.findFirst({ where: { id, orgId }, select: { id: true } }));
