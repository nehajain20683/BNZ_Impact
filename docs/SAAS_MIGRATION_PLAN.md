# SaaS Migration Plan — JITO Green Legacy → BNZ Impact

> Goal state (per brief): **BNZ Impact — Climate Impact Management Platform**, a multi-tenant product serving JITO, Rotary, other NGOs, corporates, educational institutions, and government bodies. This document assesses readiness against the *current* codebase, proposes a target architecture, and lays out a phased migration. No implementation code is included — this is a planning document.

## Part A — SaaS Readiness Assessment

### A.1 Already Reusable (build on these)

| Component | Why it's reusable |
|---|---|
| `Organization` Prisma model | Already has slug, custom domain, plan, branding fields, and ID-prefix config. This is the tenant table — it exists and is in active use by the superadmin panel. |
| `src/lib/tenant.ts` | A working tenant-resolution strategy (explicit header → custom domain → subdomain → default) with cache — this is the right *shape* of solution for org-specific domains, it just needs to be consumed by more of the app. |
| `src/lib/org-config.ts` + `OrgConfigProvider` + `useOrgConfig()` | A working runtime branding-injection pattern (fetch → CSS var → context) — the model to extend to every branding touchpoint, not just Navbar/Footer. |
| `src/app/api/public/org-config/route.ts` | The one route that correctly separates "safe public fields" from tenant secrets — a template for how every other public-facing route should be shaped. |
| `/sadmin/*` Super Admin panel + `withSuperAdmin()` HOC + `SuperAdminLayout` | The Super Admin / platform-operator surface already exists, is already branded independently of tenant theming (correctly, via `SuperAdminProviders` deliberately excluding `OrgConfigProvider`), and already has org create/list/toggle working end-to-end. |
| `src/lib/email.ts` | The one content-generation library that is already fully org-aware — the pattern (`getOrgConfig(orgId)` → fallback to defaults) should be copied into `pdf.ts` and `doc-templates.ts`. |
| `src/lib/farmer-id.ts` | Already generates IDs from the org's configured prefix rather than a hardcoded one — same pattern applies to donation ref/receipt numbers. |
| Core domain model (Donation/Tree/Campaign/Farmer/Land/PlantationSite/CarbonMonitoring, etc.) | The underlying business domain (plantation tracking, farmer onboarding, carbon dMRV, donor management) is generically applicable to *any* org running tree-plantation or land-based climate-impact programs — Rotary or another NGO would use essentially the same entities, just with different branding and configuration values. |
| NextAuth + role enum + middleware pattern | The mechanics (JWT session, role-gated middleware, `getServerSession`) are sound and reusable; what's missing is consistent application and org-scoping, not a redesign. |
| Payment (Razorpay) + Email (Resend) + PDF (Puppeteer) integrations | All three are already abstracted behind `src/lib/*` wrapper modules — swapping/adding providers per-tenant later is a config change, not an architectural one. |

### A.2 Tightly Coupled to JITO (must change)

| Component | Coupling |
|---|---|
| `src/lib/utils.ts` `BRAND` constant + `CAMPAIGNS`/`CAMPAIGN_PACKAGES` | Compiled-in JITO name/tagline/email/phone and Jain-community-specific campaign names (Dadi/Maa/Beti/Poti), imported directly (bypassing org config) into 3 pages. |
| `src/lib/pdf.ts` + `src/lib/doc-templates.ts` | Entirely hardcoded HTML templates — JITO name, Mumbai Zone, three specific logo files, Hindi tier badges, "80G Reg: [Registration Number]" placeholder, legal-entity name ("JITO Mumbai Zone, an administrative zone of Jain International Trade Organisation") embedded in contract text. Zero org parameter. |
| `src/app/layout.tsx` root metadata | Server-rendered `<title>`/description hardcoded to JITO — affects SEO/social previews for every tenant since the org-aware override is client-side only. |
| `src/app/about/page.tsx` | Named real office bearers and 11 real "JITO {Chapter}" entries — not generalizable content at all; this page's *concept* (org story/leadership) is reusable but its *content* is 100% JITO-specific. |
| `src/app/donate/page.tsx` + `src/app/admin/donations/page.tsx` | Hardcoded 17-entry JITO sub-chapter dropdown and two real JITO bank account numbers (`Bank of Ghatkopar`, `Bank of Goregaon`) — both a branding and a real-financial-data coupling issue. |
| `src/app/privacy-policy/terms/refund-policy` pages | Hardcoded JITO legal-entity references, Mumbai jurisdiction clause, Palghar district reference — legally *wrong*, not just cosmetically wrong, if shown to another tenant unmodified. |
| `src/app/impact/page.tsx` | Hardcoded real farmer names/GPS/site data instead of querying the real `PlantationSite` model. |
| Bilingual (English/Hindi) farmer-form labels (`src/lib/labels.ts`) | Fixed to one language pair reflecting JITO's Maharashtra farmer base — not configurable per tenant. |
| India-specific document types/enums (`DocumentType`: AADHAAR, PAN, LAND_7_12; `LandType`; species lists) | Assumes an Indian regulatory/land-record context — fine for JITO and likely fine for other Indian NGOs/Rotary chapters, but would need generalization for international or non-agricultural tenants (e.g., a corporate CSR tenant with no farmer-onboarding need at all, or an educational institution tenant with a completely different program type). |
| `DEFAULT_ORG_ID = 'org_jito_mumbai'` magic string | Hardcoded in both `tenant.ts` and `OrgConfigProvider.tsx` as the fallback tenant — fine as a *documented* default during transition, but currently undocumented and duplicated in two places. |

### A.3 What Needs to Change for Multi-Tenancy (the core gap)

This is the most important finding of the entire analysis: **the multi-tenancy data model exists, but is not enforced.** Specifically:

1. **Missing `orgId` scoping on almost every query.** Per [API_DOCUMENTATION.md](API_DOCUMENTATION.md), only 3 of 39 API routes filter or set `orgId`. Every list/create/update in farmer management, plantation sites, users, logs, and the public donation flow currently operates globally. Onboarding a second tenant today would let it see and edit the first tenant's data through the existing admin UI.
2. **Incomplete `Organization` relations.** `Tree`, `Land`, `FieldOfficer`, `LandAssignment`, `FarmerPayment`, `CarbonCredit`, `AuditLog`, `Receipt`, `Certificate`, and every DMRV model (`SpeciesPlan`, `PlantationActivity`, `MonitoringVisit`, `CarbonMonitoring`, `TimelineEvent`, `SiteDocument`, `SiteNotification`) have no `orgId` column at all — these need a schema migration before route-level scoping is even possible for them.
3. **Non-unique global constraints that assume one tenant.** `Farmer.mobile @unique` and `User.email @unique` are global, not compound with `orgId` — two tenants cannot each have a farmer/user with the same mobile/email under the current schema. This needs to become a compound unique constraint (`@@unique([orgId, mobile])`) if farmers/users are meant to be tenant-scoped identities (a decision to make explicitly — see Part B).
4. **No centralized authorization/tenant-scoping middleware.** Every route reimplements its own (inconsistent) auth check inline. A shared request-context helper (resolve session + resolve tenant + assert role, in one place) is needed so that adding `orgId` filtering doesn't mean touching 39 files independently with 39 chances for a mistake.
5. **PDF/document generation bypasses tenant config entirely.** `pdf.ts`/`doc-templates.ts` need an `orgId`/`OrgBranding` parameter threaded through, mirroring `email.ts`.
6. **Configurable modules & feature flags don't exist yet.** There is no concept of "this org has the DMRV module enabled" or "this org doesn't use the farmer-onboarding module" — every tenant would get the entire JITO feature surface (including farmer-onboarding fields like Aadhaar/PAN that make no sense for, say, a corporate CSR-only tenant) unless a flagging mechanism is added.
7. **Two-and-a-half parallel identity systems** (NextAuth for web users, unsigned-token+localStorage for farmers, unimplemented for field officers) need to be reconciled into one consistent, tenant-aware auth strategy before a second tenant can safely onboard "farmer" or "field officer"-type users.

### A.4 What Should Remain Unchanged

- The core Prisma domain model's *shape* (Donation → Tree → Certificate/Receipt lifecycle; Farmer → Land → LandAssignment → PlantationSite → Monitoring/Carbon lifecycle) — this generalizes well to "climate impact management" broadly; only the org-scoping and configurability need to be added around it, not a redesign of the entities themselves.
- NextAuth as the auth mechanism for staff/admin-type users — it works, it's a standard choice, and rebuilding it is not warranted.
- Razorpay/Resend/Puppeteer as the payment/email/PDF providers — these can remain the default providers; if different tenants eventually need different payment gateways (e.g., a US-based tenant needing Stripe), that's an additive provider-abstraction change, not a reason to replace what exists for India-based tenants today.
- The Super Admin control-plane concept and its visual/branding independence from tenant sites (`SuperAdminLayout`, deliberate exclusion of `OrgConfigProvider`) — this separation is correct and should be preserved exactly.
- The general Next.js App Router / Vercel serverless deployment model — appropriate for the workload and scale described.

### A.5 What Should Be Generalized

- **"Tree Plantation"** as a hardcoded concept should become one instance of a more general **"Impact Program"** or **"Project Type"** abstraction, so that a future tenant running (for example) a scholarship program or a water-well program isn't forced through tree/species/carbon-specific fields. This is a larger, longer-horizon change than the rest of this plan and should be scoped separately once the first 2-3 real non-JITO tenants clarify what they actually need.
- **Document/legal templates** (`doc-templates.ts`, `pdf.ts`) should become org-configurable templates (org name/logo/legal-entity-name/signatory/registration-number as parameters) rather than fixed HTML strings — the specific *document types* (participation agreement, NOC, receipts) can remain as-is; only their content sourcing needs to generalize.
- **Bilingual label support** (`labels.ts`) should generalize from a fixed English/Hindi pair to an org-configurable language pair (or list), reusing the existing `{en, hi}`-shaped dictionary pattern but keyed by a per-org language configuration.
- **Chapter/sub-unit concept** (JITO's 17 chapters) should generalize into an org-configurable list of "sub-units" or "chapters" rather than a hardcoded dropdown — some tenants (a small NGO) may have none; others (Rotary, with districts and clubs) may have a different hierarchy shape entirely, suggesting this should be a simple configurable flat list initially rather than over-engineering a hierarchy no confirmed tenant has asked for yet.
- **CO2/carbon-factor constants** (`22 kg/tree/year`, `0.022 tCO2/tree/year`, `800 trees/acre`) should move from hardcoded numbers to org- or project-level configuration, since different regions/species have materially different real figures.

## Part B — Suggested Architecture for BNZ Impact

### B.1 Multi-Tenancy Model

Recommend **shared database, shared schema, row-level tenant isolation via `orgId`** (not separate databases/schemas per tenant) — this matches what's already 80% built (`Organization` + optional `orgId` columns), avoids the operational overhead of per-tenant database provisioning, and is the standard, well-understood approach for a SaaS product at this stage of maturity. Re-evaluate only if a specific enterprise/government tenant contractually requires physical data isolation (a plausible future requirement for a "Government Bodies" tenant category — track it, don't build for it preemptively).

Key structural decisions:
- **Every tenant-owned table gets a required (not optional) `orgId`** once migration is complete — the current `String?` (optional) should become `String` (required) after backfill, so the type system itself prevents a future accidental cross-tenant query at the Prisma level (optional fields make it too easy to forget the filter).
- **Compound unique constraints replace global ones** where an entity is conceptually scoped to a tenant (e.g., `Farmer.mobile` → `@@unique([orgId, mobile])`), while entities that are legitimately global platform-wide (e.g., the Super Admin's own login) stay global.
- **A single request-context resolver** (server-side helper called at the top of every route) that: resolves the authenticated session → resolves the tenant (from session's `orgId` for staff, or from subdomain/custom-domain for public/anonymous requests) → asserts the two are consistent → returns a typed context object other route logic reads from. This replaces the current copy-pasted inline auth checks and is the single highest-leverage architectural change in this plan.

### B.2 White-Label Branding & Organization-Specific Domains

Extend the existing `tenant.ts`/`OrgConfigProvider` pattern (already correct in shape) to cover every touchpoint currently bypassing it:
- Root metadata (`layout.tsx`) becomes server-side tenant-aware (Next.js `generateMetadata()` resolving org from the request, not a client-side title overwrite) so SSR/SEO/social-preview all reflect the correct tenant.
- `pdf.ts`/`doc-templates.ts` accept an `OrgBranding` parameter (mirroring `email.ts`) so receipts, certificates, and legal documents render with the correct tenant's name/logo/color/registration number.
- Custom-domain resolution (`Organization.custom_domain`) and subdomain resolution (`{slug}.bnzgreen.io`, already referenced in the Super Admin UI) both already exist in `tenant.ts` — this becomes the standard resolution path for every request, not just `/api/public/org-config`.

### B.3 Role Structure

| Tier | Maps to | Scope |
|---|---|---|
| **Super Admin** | Existing `/sadmin/*` + `Role.SUPER_ADMIN` | Platform operator (BNZ) — manages all organizations, plans, billing, global settings. Already exists; needs the 4 placeholder pages (Users, Plans, Billing, Analytics) built out. |
| **Organization Admin** | Existing `Role.ADMIN`, but must become `orgId`-scoped | Manages one organization's donors, farmers, sites, campaigns, staff, branding/settings. This is what `/admin/*` already does — it needs org-scoping added, not a new UI. |
| **Member Portal** | New tier, generalizing the existing Donor Dashboard (`/dashboard`) and Farmer Portal (`/farmer/*`) | The org's own end-users (donors, farmers, or other "member" types depending on the org's program) — the existing donor dashboard and farmer portal are both already shaped like member portals; they should converge on one consistent auth mechanism (see A.3 point 7) rather than remaining two separate systems. |

### B.4 Configurable Modules & Feature Flags

Add an org-level module-configuration concept (e.g., a `modules` JSON field or a dedicated `OrganizationModule` join table) that gates which of the existing feature areas are active per tenant: Donations/Campaigns, Farmer Onboarding, Plantation Sites, Carbon dMRV, CSR Inquiries. This lets a corporate-only tenant disable farmer onboarding entirely (hiding Aadhaar/PAN/bank-detail collection that would be irrelevant/inappropriate for their use case) while a full NGO tenant like JITO or Rotary keeps everything enabled. This is additive to the existing `Organization.plan` field, which should govern *tier limits* (e.g., number of admins, storage), while the modules concept governs *which features exist at all*.

### B.5 Organization Settings

Extend the existing Super Admin org-create form (`/sadmin/orgs`, already collects name/slug/plan/color/tree-price/prefixes/custom-domain/80G-number) into a self-service **Organization Admin → Settings** page (currently a placeholder at `/admin` — there is no settings page in the admin panel today, only in Super Admin) so org admins can manage their own branding/contact/payment-account details without needing the platform operator to do it for them via Super Admin. The `payment_banks` JSON field already on `Organization` is the right place for this — it just needs a UI and needs `admin/donations/page.tsx`'s hardcoded `BANKS` array replaced with a read from it.

### B.6 Scalable Architecture Notes

- Replace the in-memory `Map`-based tenant cache (`tenant.ts`) with a distributed cache (Vercel KV / Redis / Upstash) once running on more than one serverless instance matters for cache-hit consistency — not urgent at one tenant, worth doing before the second or third tenant onboards.
- Add `@@index` on every `orgId` column as it's introduced, and add composite indexes for the query patterns already visible in the admin dashboard/list routes (e.g., `Donation(orgId, paymentStatus, createdAt)`).
- Move farmer/site document storage off base64-in-database to real object storage (S3/Cloudinary/Supabase Storage) — necessary regardless of multi-tenancy, but more urgent as tenant count and document volume grow.
- Introduce a proper migration discipline (only `prisma migrate dev`/`deploy`, no more hand-run SQL scripts against production) before any tenant-facing schema change ships, given the schema-drift finding in [CODE_REVIEW.md](CODE_REVIEW.md).

## Part C — Phased Migration Strategy

Ordered for minimal risk and minimal code churn per phase; each phase should be shippable and independently valuable even if later phases are delayed.

### Phase 0 — Stabilize the Foundation (prerequisite, not SaaS-specific)

- **Objective**: Fix the issues that would undermine *any* further work — security bugs and schema-drift — before building multi-tenancy on top of them.
- **Files likely to change**: `src/app/api/admin/agreements/route.ts` (fix swallowed auth check), `src/app/api/admin/plantation-sites/**` (add missing auth/role checks across ~7 sub-routes), `src/app/api/contact/route.ts` (add auth to GET), `src/app/api/field-officer/inspect/route.ts` (add auth), `src/app/api/farmer/**` (add real token verification — see Phase 2, may be pulled forward for the worst offenders like `profile` PATCH), `src/app/api/payment/verify/route.ts` (add order/donation cross-check), `src/app/auth/login/page.tsx` (remove plaintext credential hint).
- **Database changes**: None required, but this phase should also **reconcile `schema.prisma` with the actual production database** (run `prisma migrate dev` to generate a proper migration capturing everything currently only reflected in `FARMER_MODULE_SQL.sql` and subsequent manual changes) so the migration history is trustworthy going forward.
- **Estimated complexity**: Medium (many small, independent fixes; no architectural change).
- **Risks**: Low technical risk per fix, but doing this against a live production database requires careful backup/rollback planning for the migration-reconciliation step specifically.
- **Dependencies**: None — this can start immediately and does not block on any SaaS-specific decision.

### Phase 1 — Enforce Tenant Scoping in the Data Layer

- **Objective**: Make `orgId` mandatory and consistently enforced everywhere it already exists, and add it where it's missing, without changing any user-facing behavior for the existing single tenant.
- **Files likely to change**: All 39 `src/app/api/**/route.ts` files (add `orgId` resolution + filtering to every query), a new shared helper (e.g. `src/lib/request-context.ts`) that centralizes session+tenant+role resolution for reuse across routes.
- **Database changes**: Add `orgId` (required, backfilled to the existing default org) to `Tree`, `Land`, `FieldOfficer`, `LandAssignment`, `FarmerPayment`, `CarbonCredit`, `AuditLog`, `Receipt`, `Certificate`, and all DMRV models; convert existing optional `orgId` columns to required once backfilled; add `@@index([orgId, ...])` to frequently-filtered tables; convert `Farmer.mobile` and similar globally-unique fields to compound-unique with `orgId` (pending the identity-model decision in Phase 2).
- **Estimated complexity**: High (touches every route file, requires careful backfill migration, requires full regression testing of the existing JITO tenant to ensure zero behavior change).
- **Risks**: Highest-risk phase in the plan — a missed `orgId` filter anywhere reintroduces the cross-tenant leak this phase exists to fix; recommend a checklist/lint rule requiring every Prisma call in `src/app/api` to include an `orgId` clause, enforced by code review until a second real tenant exists to test against.
- **Dependencies**: Phase 0 (a trustworthy migration history) must complete first.

### Phase 2 — Reconcile Identity Systems

- **Objective**: Replace the unsigned farmer token with a real, verifiable session (ideally unifying farmers into the same NextAuth-based mechanism as web users, with a `FARMER` principal type, or at minimum a signed JWT with server-side verification on every farmer route), and decide/implement the Field Officer login flow (currently has no UI at all).
- **Files likely to change**: `src/app/api/farmer/login/route.ts`, `src/app/api/farmer/otp/route.ts`, every `src/app/api/farmer/**` route (add real ownership checks), `src/app/farmer/**/page.tsx` (swap `localStorage` token handling for the new mechanism), a new `src/app/field-officer/login/page.tsx` + corresponding API auth.
- **Database changes**: Depends on the chosen approach — if unifying into `User`, this may mean migrating `Farmer`/`FieldOfficer` data into `User` with a `role`/`type` discriminator (a larger change), or, more conservatively, adding proper signed-session support without merging tables (smaller change, recommended first).
- **Estimated complexity**: High if unifying models; Medium if only adding proper token verification without merging `Farmer`/`FieldOfficer` into `User`.
- **Risks**: Any farmer-facing session change requires careful rollout since farmers are non-technical end-users least tolerant of a broken login flow; recommend a parallel-run period (old and new token accepted) if any real farmers are already registered in production.
- **Dependencies**: None strictly on Phase 1, but logically pairs with it since both are prerequisites for safely onboarding a second tenant's farmers.

### Phase 3 — De-Brand Content & Templates

- **Objective**: Make every branding touchpoint identified in [BRANDING_ANALYSIS.md](BRANDING_ANALYSIS.md) org-aware, so a second tenant's site, emails, receipts, certificates, and legal documents show their own identity, not JITO's.
- **Files likely to change**: `src/lib/utils.ts` (remove/replace `BRAND` constant usage in `page.tsx`/`donate/page.tsx`/`success/page.tsx`), `src/lib/pdf.ts` and `src/lib/doc-templates.ts` (thread an `OrgBranding` parameter through, mirroring `email.ts`), `src/app/layout.tsx` (server-side `generateMetadata()`), `src/app/admin/donations/page.tsx` (replace hardcoded `BANKS`/`CHAPTERS` arrays with reads from `Organization.payment_banks` and a new org-configurable chapters/sub-units list), legal pages (`privacy-policy`, `terms`, `refund-policy` — convert to org-configurable text blocks or a simple CMS-lite field on `Organization`), `src/app/about/page.tsx` (decide: drop for SaaS tenants, or convert to org-editable content blocks).
- **Database changes**: Add fields to `Organization` (or a related `OrganizationContent`/settings table) for: legal-entity name, 80G/tax-registration number (already has `org_80g_number` — verify it's actually wired into `pdf.ts` after this phase), legal page text blocks, chapters/sub-units list, supported language pair.
- **Estimated complexity**: Medium — mostly plumbing (passing an already-resolved `OrgBranding` object into functions that don't currently accept one), the main effort is the sheer number of touchpoints (cataloged exhaustively in `BRANDING_ANALYSIS.md`) rather than any individual change being hard.
- **Risks**: Low technical risk; main risk is scope creep (tempting to also redesign the templates while touching them — resist, this phase is about parameterization, not a redesign) and the legal-content question (who owns writing new legal text for tenant #2 — likely a business/legal task, not an engineering one, but blocks this phase's "done" definition for that specific item).
- **Dependencies**: Benefits from Phase 1 (tenant resolution should be reliable before wiring branding everywhere) but is not strictly blocked by it — could run in parallel.

### Phase 4 — Configurable Modules & Org Self-Service Settings

- **Objective**: Let each tenant enable/disable feature modules and manage their own settings without Super Admin involvement for routine changes.
- **Files likely to change**: New `src/app/admin/settings/page.tsx` (org self-service settings, doesn't exist today), a new module-configuration model/field on `Organization`, conditional rendering in `Navbar`/admin sidebar based on enabled modules, `middleware.ts` or route-level checks to actually block disabled-module routes (not just hide the nav link).
- **Database changes**: Add a `modules` JSON field or dedicated join table to `Organization`.
- **Estimated complexity**: Medium.
- **Risks**: Low — mostly additive; main risk is under-scoping which modules are truly independent vs. which have hidden cross-dependencies (e.g., Carbon dMRV currently has no real data wiring at all per [BUSINESS_MODULES.md](BUSINESS_MODULES.md), so "disabling" it today is nearly a no-op — sequence this after the DMRV module actually has real functionality, or treat it as out-of-scope for the flag system until then).
- **Dependencies**: Phase 1 (org-scoped data) and ideally Phase 3 (branding) should be further along first, since a self-service settings page needs both a data model that's tenant-scoped and a branding pipeline for the settings to actually affect.

### Phase 5 — Onboard the First Non-JITO Tenant

- **Objective**: Validate everything above against a real second organization (recommend starting with a structurally similar tenant — another India-based NGO/Rotary chapter — before attempting a materially different one like a government body or an international corporate, since the India-specific assumptions cataloged in Part A.2 are still present at this point and haven't been generalized yet).
- **Files likely to change**: None expected if Phases 1–4 were done correctly — this phase is validation, not development. Any file changes needed here indicate a gap in earlier phases' completeness.
- **Database changes**: One new `Organization` row (via the existing Super Admin UI) plus whatever org-specific config that tenant needs.
- **Estimated complexity**: Low (if prior phases are solid) to High (if they weren't — this phase will surface every remaining gap the hard way).
- **Risks**: This is where every incomplete `orgId` filter, every still-hardcoded string, and every untested auth path becomes a real incident with a real second customer's data — treat this as a soft/staged launch (internal or friendly-tenant pilot) rather than a public GA.
- **Dependencies**: Phases 1–3 at minimum; Phase 4 is valuable but not strictly blocking if the pilot tenant's needs happen to match JITO's module set closely.

### Phase 6 — Generalize Beyond Tree Plantation (longer horizon, scope after real tenant feedback)

- **Objective**: Generalize the "Impact Program" concept per Part A.5 based on what the first 2-3 real tenants actually need, rather than speculatively building for hypothetical program types now.
- **Files likely to change / Database changes / Complexity / Risks**: Deliberately left unscoped — per the brief's request for "minimal code changes" and this analysis's principle of grounding conclusions in the existing codebase, speculative design for program types no confirmed tenant has requested would be premature. Revisit this phase's scope once Phase 5 produces real requirements.
- **Dependencies**: Phase 5 (real tenant feedback).
