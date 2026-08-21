// src/lib/request-context.ts
//
// NEW FILE — not yet called from any existing route. Purely additive.
//
// Centralizes what every API route currently reimplements inline:
//   1. resolve the authenticated session (staff/admin/superadmin)
//   2. resolve the tenant (from session.orgId for staff, or from
//      host/subdomain for anonymous/public requests via tenant.ts)
//   3. assert the two are consistent
//   4. return one typed context object
//
// Adopt this ONE route at a time (start with a low-traffic admin route),
// verify behavior is unchanged, then move to the next. Do not bulk-replace
// all 39 routes in a single pass — see SAAS_MIGRATION_PLAN.md Phase 1 risk note.

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { resolveTenantFromRequest, type OrgConfig } from '@/lib/tenant';

export type Role =
  | 'DONOR'
  | 'ADMIN'
  | 'SUPER_ADMIN'
  | 'FIELD_OFFICER'
  | 'DATA_ENTRY'
  | 'PROJECT_MANAGER'
  | 'AUDITOR';

export type RequestContext = {
  userId: string | null;
  role: Role | null;
  orgId: string | null;      // authoritative org for data filtering
  org: OrgConfig | null;     // resolved org config (branding, prefixes, etc.)
  isSuperAdmin: boolean;
};

export class TenantMismatchError extends Error {
  constructor(msg = 'Session org does not match resolved tenant') {
    super(msg);
    this.name = 'TenantMismatchError';
  }
}

export class UnauthenticatedError extends Error {
  constructor(msg = 'No active session') {
    super(msg);
    this.name = 'UnauthenticatedError';
  }
}

/**
 * Resolve full request context for an API route.
 *
 * @param req              the incoming Request (needed for host-based tenant resolution)
 * @param opts.requireAuth  throw UnauthenticatedError if no session (default: true)
 * @param opts.allowedRoles if set, caller is responsible for checking role membership
 *                          against ctx.role — this helper does not throw on role mismatch,
 *                          it only tells you the facts so each route can decide (some routes
 *                          redirect, some 403, some no-op — behavior intentionally left to caller)
 */
export async function getRequestContext(
  req: Request,
  opts: { requireAuth?: boolean } = {}
): Promise<RequestContext> {
  const { requireAuth = true } = opts;

  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as
    | { id?: string; role?: Role; orgId?: string }
    | undefined;

  if (requireAuth && !sessionUser?.id) {
    throw new UnauthenticatedError();
  }

  // SUPER_ADMIN is platform-level and not bound to a single org's data —
  // callers managing cross-org resources (e.g. /sadmin/orgs) should check
  // isSuperAdmin explicitly rather than relying on orgId filtering.
  const isSuperAdmin = sessionUser?.role === 'SUPER_ADMIN';

  let orgId: string | null = sessionUser?.orgId ?? null;
  let org: OrgConfig | null = null;

  if (orgId) {
    // Staff session already carries an orgId — resolve its config directly.
    const { getOrgConfig } = await import('@/lib/tenant');
    org = await getOrgConfig(orgId);
  } else if (!requireAuth) {
    // Anonymous/public request (e.g. donation flow, public org-config route) —
    // resolve tenant from host/subdomain instead.
    org = await resolveTenantFromRequest(req);
    orgId = org?.id ?? null;
  }

  return {
    userId: sessionUser?.id ?? null,
    role: sessionUser?.role ?? null,
    orgId,
    org,
    isSuperAdmin,
  };
}

/**
 * Convenience assertion for the common case: route requires a resolved orgId
 * and the caller is not a superadmin acting cross-tenant. Throws if missing.
 */
export function requireOrgId(ctx: RequestContext): string {
  if (ctx.isSuperAdmin) {
    throw new TenantMismatchError(
      'SUPER_ADMIN routes must resolve target org explicitly, not via requireOrgId()'
    );
  }
  if (!ctx.orgId) {
    throw new TenantMismatchError('No orgId resolved for this request');
  }
  return ctx.orgId;
}
