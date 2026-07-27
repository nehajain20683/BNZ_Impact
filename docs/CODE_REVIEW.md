# Code Quality Review — JITO Green Legacy Platform

> Findings are grouped by severity/category. Every item cites a specific file (and line, where the source was read directly) so it can be independently verified. This document does not propose code changes — see [SAAS_MIGRATION_PLAN.md](SAAS_MIGRATION_PLAN.md) for remediation sequencing.

## 1. Security — Critical

| # | Finding | Location |
|---|---|---|
| 1 | **Farmer "authentication" is an unsigned, unverified token.** `farmer/login` and `farmer/otp` (PUT) issue `Buffer.from(JSON.stringify({...})).toString('base64')` as a session token. No API route ever decodes/verifies this token against the caller — every farmer-scoped endpoint (`farmer/profile`, `farmer/land`, `farmer/documents`, `farmer/agreements`) simply trusts a `farmerId`/`mobile` value supplied directly in the request. Any client can read or modify **any farmer's** bank account/IFSC, nominee Aadhaar, land records, or documents by supplying a different ID. | `src/app/api/farmer/login/route.ts`, `src/app/api/farmer/otp/route.ts`, `src/app/api/farmer/profile/route.ts`, `src/app/api/farmer/land/route.ts`, `src/app/api/farmer/documents/route.ts`, `src/app/api/farmer/agreements/route.ts` |
| 2 | **Multiple GET routes on plantation sites have no authentication at all**, exposing farmer names, mobile numbers, and GPS coordinates to unauthenticated callers. | `src/app/api/admin/plantation-sites/route.ts` (GET), `.../[id]/route.ts` (GET), `.../[id]/dashboard/route.ts`, `.../[id]/activities/route.ts` (GET), `.../[id]/assignments/route.ts` (GET), `.../[id]/documents/route.ts` (GET), `.../[id]/monitoring/route.ts` (GET) |
| 3 | **`PATCH` on plantation site detail requires only *any* logged-in session, no role check** — a DONOR-role account can edit any site's budget, team, or targets. Same pattern on activities/assignments/documents/monitoring POST/PATCH. | `src/app/api/admin/plantation-sites/[id]/route.ts` (PATCH) and sibling sub-routes |
| 4 | **`GET /api/admin/agreements` swallows its own auth check.** `await requireAdmin(req).catch(() => {})` discards the thrown auth error and the handler proceeds regardless — the list of all farmer legal documents is effectively public. | `src/app/api/admin/agreements/route.ts` (GET) |
| 5 | **`GET /api/contact` has no auth check** despite a code comment stating it is "Admin: list all contact inquiries" — up to 100 name/mobile/email/message records are publicly readable. | `src/app/api/contact/route.ts` (GET) |
| 6 | **`/api/field-officer/inspect` has no authentication**; `officerId` is taken directly from the request body. Any client can submit or forge an inspection report — including farmer status transitions and audit-log entries — attributed to an arbitrary officer identity. | `src/app/api/field-officer/inspect/route.ts` |
| 7 | **Donation receipts, certificates, and detail are fully public with no ownership check.** Anyone who obtains or guesses a donation ID can view another donor's name, email, PAN (tax ID), mobile, and address. | `src/app/api/donations/[id]/route.ts`, `src/app/api/certificates/[id]/pdf/route.ts`, `src/app/api/receipts/[id]/pdf/route.ts` |
| 8 | **Payment verification does not cross-check the order/donation linkage before marking a donation `COMPLETED`.** The signature check validates the Razorpay order/payment/signature triplet, but the handler then updates `where:{id: donationId}` using a client-supplied `donationId` without confirming `donation.paymentOrderId === razorpay_order_id`. A manipulated `donationId` paired with a signature from a different (attacker-controlled, cheaper) order could mark an unrelated donation as paid. | `src/app/api/payment/verify/route.ts` |
| 9 | **A plaintext example admin credential is rendered in the login page UI**: `"Admin: admin@jitomumbai.org / admin@123"`. | `src/app/auth/login/page.tsx` |
| 10 | **No rate limiting anywhere** — OTP send/verify (`farmer/otp`, `auth/forgot-password`), password login (`farmer/login`, NextAuth Credentials), and contact/CSR forms are all unthrottled, enabling brute force and SMS/email-bombing. | Repo-wide |
| 11 | **OTP leakage gated on the wrong condition in one path.** `farmer/otp` returns `devOtp` whenever SMS-provider credentials (MSG91/Twilio) are absent — not gated on `NODE_ENV`. A production deployment that simply forgets to configure an SMS provider will leak OTPs directly in API responses. (Contrast: `auth/forgot-password` correctly gates its dev-OTP echo on `NODE_ENV !== 'production'`.) | `src/app/api/farmer/otp/route.ts` |
| 12 | **`GET /api/farmer/agreements/[id]` renders `agreement.generatedHtml` unescaped into the response** and has no auth check; the document contains Aadhaar numbers and survey details. Currently low-exploitability (content is server-templated, not raw user input) but latent stored-XSS shape if that ever changes, and a PII exposure regardless. | `src/app/api/farmer/agreements/[id]/route.ts` |

## 2. Security — Moderate

- **Error messages leak internals to clients.** Nearly every route's `catch` block returns `{error: e.message}` on 400/500, exposing raw Prisma error text and, in one case, an explicit hint to check `RESEND_API_KEY` (`admin/donations/send-email/route.ts`).
- **No application-level role allow-list on role assignment.** `PATCH /api/admin/users` (`change_role` action) lets any ADMIN set `role` to any value including `SUPER_ADMIN` — self- or peer-promotion is possible with no additional check beyond "caller is ADMIN."
- **`/api/admin/farmers` role check excludes SUPER_ADMIN** (only `role === 'ADMIN'` passes), inconsistent with every sibling admin route that allows both — likely an unintentional gap that would lock super admins out rather than a deliberate restriction.
- **Field-naming inconsistency between tenant-management routes**: `POST /api/superadmin/orgs` accepts camelCase (`primaryColor`, `logoUrl`), while `PATCH /api/superadmin/orgs/[id]` expects snake_case (`primary_color`, `logo_url`) — a client built against one will silently no-op fields on the other.

## 3. Database & Migration Integrity

- **Only one Prisma migration exists** (`prisma/migrations/20260523143756_init`), reflecting the original 9-model MVP schema. The current `schema.prisma` has 26 models and 15 enums — everything added since (the entire `Organization`, `Farmer`, `FieldOfficer`, `Land`, and DMRV/plantation-site-enhancement surface) has **no corresponding migration**.
- **`FARMER_MODULE_SQL.sql`** is a hand-written script explicitly labeled "Run this in Supabase SQL Editor" — confirming that schema evolution has been happening via manual DDL applied directly to the database rather than through `prisma migrate`. This means `prisma migrate deploy` (the command documented in `DEPLOYMENT.md` and wired as `npm run db:deploy`) would not reproduce the actual production schema from a clean database — a serious environment-reproducibility and disaster-recovery gap.
- **`admin/plantation-sites/[id]/activities/route.ts` contains a try/catch-and-retry specifically to handle a Prisma `create` failing on newer columns** (`speciesPlanted`/`driveLink`), i.e., the application code has been defensively patched to tolerate the exact schema drift described above, rather than the drift being fixed at the source.
- **No non-unique indexes are declared anywhere** in `schema.prisma` (`@@index` is never used). Every unique constraint incidentally provides an index, but common filter columns — most importantly `orgId` on every multi-tenant-capable model — have no index at all, which will matter as soon as tenant/row counts grow (see [DATABASE_DOCUMENTATION.md](DATABASE_DOCUMENTATION.md) §5).
- **The `Organization` Prisma model is accessed via `(prisma as any).organization`** in multiple files (`tenant.ts`, `farmer-id.ts`, `superadmin/orgs/route.ts`) — a sign the Prisma Client may not have been regenerated after schema changes, and a repeated disabled-type-safety pattern.

## 4. Hardcoded Values (Non-Branding)

Beyond the JITO-brand-specific hardcoding catalogued in full in [BRANDING_ANALYSIS.md](BRANDING_ANALYSIS.md), several **business-rule constants** are hardcoded where they should be configuration:
- `expectedCO2: 22` kg/tree/year in `payment/verify/route.ts` and duplicated as `numberOfTrees * 22` in `pdf.ts`/`utils.ts`'s `calculateCO2`.
- Carbon-credit estimation formula (survival % × 0.022 tCO2/tree/year × 25-year crediting period) hardcoded in the `/admin/plantation-sites` create-site wizard.
- Land capacity rule (`800 trees/acre`) hardcoded in `admin/plantation-sites/[id]/assignments/route.ts`.
- Receipt/reference-number prefixes (`JGL`, `#JITO-`) hardcoded in `admin/donations/bulk/route.ts` and `utils.ts`'s `generateReceiptNumber()`, bypassing the already-existing `Organization.donation_ref_prefix` field used correctly elsewhere (`admin/donations` POST).
- `next.config.js` sets both `eslint.ignoreDuringBuilds: true` and `typescript.ignoreBuildErrors: true` — the build pipeline will pass even with type errors or lint failures, which explains how the `(prisma as any)` casts and similar issues persist undetected.

## 5. Duplication

- **GPS-capture + Nominatim reverse-geocode logic** is copy-pasted near-verbatim between `src/app/farmer/register/page.tsx` and `src/app/farmer/land/page.tsx` — a clear candidate for a shared `useGpsCapture` hook.
- **Survival/mortality percentage calculation** appears independently in both the monitoring-visit route and the per-site dashboard route, with no shared utility.
- **Tier-badge logic** (Diamond/Platinum/Gold/Silver Legacy, Hindi labels) is defined twice with the same values: once in `src/lib/utils.ts` (`CAMPAIGN_PACKAGES`) and again in `src/lib/pdf.ts` (`getTierBadge()`).
- **6 of 9 `/admin/dmrv/*` pages and 4 of 6 `/sadmin/*` pages are byte-for-byte identical placeholder templates**, differing only by a lookup key into a shared `META` object — a strong candidate for consolidating into a single dynamic `[module]/page.tsx` route.
- **Chapter-name dropdown** (17 JITO sub-chapters) is duplicated between `src/app/donate/page.tsx` and `src/app/admin/donations/page.tsx`.
- **Farmer token-issuing logic** is duplicated between `farmer/login/route.ts` and `farmer/otp/route.ts` (PUT) rather than extracted into a shared helper.
- **Ref-number generation** (`count()`-then-format, non-atomic) is duplicated in `admin/donations/route.ts` (`generateRefId`) and `admin/donations/bulk/route.ts`, each with its own subtly different prefix logic and both exposed to the same race condition on concurrent creates.

## 6. Tight Coupling & Missing Abstractions

- **`src/lib/pdf.ts` and `src/lib/doc-templates.ts` take no `orgId`/branding parameter at all**, while `src/lib/email.ts` (a structurally similar template-rendering concern) does correctly accept one and calls `getOrgConfig`. This is the most consequential coupling issue for the SaaS migration: two of the three "generate branded output" subsystems bypass the tenant-config layer entirely.
- **No shared UI primitives.** Every page reimplements its own hero/card/input/toast markup with local Tailwind class-string constants (`inputCls`, `cardCls`, etc.) rather than a shared `<FormInput>`, `<Hero>`, or `<Toast>` component — `src/components/` contains only layout shells and two admin-specific components, no generic design-system pieces.
- **Three parallel, non-interoperating auth/identity systems** coexist: NextAuth JWT sessions (`User`), a bespoke unsigned-token + localStorage scheme (`Farmer`), and a separate email+password scheme with no session mechanism visible in the reviewed routes at all (`FieldOfficer`, who also has no frontend to log in through). Any cross-cutting concern (rate limiting, audit attribution, RBAC) has to be solved three times.
- **The `Organization` model's back-relations are incomplete** — it relates to `User`, `Campaign`, `Donation`, `Farmer`, `PlantationSite`, `MasterProject`, but not to `Tree`, `Land`, `FieldOfficer`, `LandAssignment`, `FarmerPayment`, `CarbonCredit`, `AuditLog`, `Receipt`, `Certificate`, or any DMRV model — so even a fully-fixed set of API routes couldn't scope every table by tenant without a schema migration first.

## 7. Performance

- **N+1 query patterns**: `admin/donations/bulk/route.ts` runs a `prisma.donation.count()` inside a per-row loop; `superadmin/orgs/route.ts` runs 3 count queries per organization via `Promise.all(orgs.map(...))` rather than a single grouped aggregate — fine at today's scale (one real tenant), but won't scale as tenant/row counts grow.
- **`admin/export-csv` hard-caps at 1000 rows with no pagination** — exports will silently truncate for any organization whose donation history exceeds that.
- **No caching beyond a 60-second in-memory `Map` in `tenant.ts`** — fine for a single-instance/dev deployment, but an in-memory cache does not share state across multiple serverless function instances on Vercel, so cache hit rates in production are likely much lower than the code's comments imply, and cache invalidation (`invalidateOrgCache`) only affects the instance that handles the invalidating request.
- **No non-unique indexes** (repeated from §3) will become a query-performance issue specifically on `orgId`-filtered queries once those filters are actually added during the SaaS migration.

## 8. Scalability Concerns

- **Farmer identity is globally unique by mobile number** (`Farmer.mobile @unique`), with no compound uniqueness per organization — two different tenants cannot each have a farmer using the same mobile number under the current schema, a real conflict for a multi-tenant farmer-onboarding product.
- **File "uploads" are stored as base64 data URLs** (farmer documents, per the frontend audit) rather than in object storage — this bloats database rows and will not scale past a modest number of documents per farmer.
- **PDF generation runs a full headless Chromium instance per request** (`generate-pdf.ts`, via `puppeteer-core` + `@sparticuz/chromium-min`) inside a Vercel serverless function with a 30-second timeout (per `vercel.json`) — acceptable at low volume, but cold-start latency and per-invocation cost will grow linearly with tenant count and receipt/certificate volume with no batching or caching of rendered output.
- **In-memory tenant-config cache** (see §7) does not horizontally scale across serverless instances, which matters more as tenant count grows and each cache miss triggers a fresh DB round-trip.

## 9. Documentation Drift

- **`README.md` describes a stack that no longer matches the codebase**: Next.js 15 (actual: 14.2.18), NextAuth v5 (actual: v4.24.10), SendGrid (actual: Resend), ₹450/tree pricing (actual: ₹500), and a folder structure that omits the entire farmer/plantation-site/DMRV/superadmin surface — the README reflects an earlier, much smaller version of the product.
- **`prisma/seed.ts` has unreachable/misplaced logic**: a field-officer-seeding block (lines ~72–89) appears *after* the `main().catch().finally()` call chain at the top level of the module, relying on implicit top-level `await` support outside of an `async function` wrapper — this is fragile depending on the `ts-node`/module target configuration and is easy to break silently if the seed script is ever refactored without noticing the ordering dependency.

## 10. What Is Done Well (for balance)

- `src/lib/tenant.ts` and `src/app/api/public/org-config/route.ts` are a clean, well-considered tenant-resolution design (header → custom domain → subdomain → default fallback) with an explicit "safe fields only" boundary for what's exposed publicly — a good template to extend.
- `src/app/api/payment/webhook/route.ts` correctly verifies the HMAC signature before parsing/acting on the payload — solid webhook security practice.
- `src/app/api/auth/register/route.ts` and `src/app/api/farmer/land/route.ts` both use thorough zod schemas — the strongest input validation in the codebase, and a good pattern to standardize on everywhere else.
- `src/app/api/auth/forgot-password/route.ts` deliberately avoids revealing whether a submitted email exists in the system — correct anti-enumeration practice.
- The `Organization`/tenant scaffolding (schema fields, `tenant.ts`, `org-config.ts`, `OrgConfigProvider`, the `/sadmin` control panel) demonstrates the team already understood the multi-tenancy target and built a genuine foundation for it — the gap is in *coverage* (most routes/pages don't yet consume it), not in the foundational design.
