# API Documentation — JITO Green Legacy Platform

> All 39 route files under `src/app/api/**/route.ts`, documented from the actual source. `src/middleware.ts` only guards **pages** (`/sadmin`, `/superadmin`, `/admin`, `/dashboard`) — it does not match `/api/*`, so every API route is individually responsible for its own auth check, and several have none at all (flagged below and detailed in [CODE_REVIEW.md](CODE_REVIEW.md)).

Legend for **Auth** column: 🔓 public · 🔑 any logged-in session (no role check) · 🛡️ role-gated (role noted) · ⚠️ intended to be gated but has a bug.

## 1. Admin — Donations & Dashboard

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/api/admin/dashboard` | Aggregate KPI stats (totals, recent donations, recent sites) | 🛡️ ADMIN/SUPER_ADMIN |
| GET | `/api/admin/export-csv?json=1` | List donations as JSON (capped at 1000, no pagination) | 🛡️ ADMIN/SUPER_ADMIN |
| GET | `/api/admin/export-csv` | Export donations as a CSV file download | 🛡️ ADMIN/SUPER_ADMIN |
| GET | `/api/admin/export-csv?template=1` | Download a blank CSV import template | 🛡️ ADMIN/SUPER_ADMIN |
| POST | `/api/admin/donations` | Manually create a donation (cash/bank/cheque/online) | 🛡️ ADMIN/SUPER_ADMIN |
| PATCH | `/api/admin/donations` | Edit an existing donation (allow-listed fields) | 🛡️ ADMIN/SUPER_ADMIN |
| DELETE | `/api/admin/donations` | Delete a donation | 🛡️ ADMIN/SUPER_ADMIN |
| POST | `/api/admin/donations/bulk` | Bulk-import donations from parsed CSV rows | 🛡️ ADMIN/SUPER_ADMIN |
| POST | `/api/admin/donations/send-email` | Resend confirmation/certificate email for a donation | 🛡️ ADMIN/SUPER_ADMIN |

**Request/response detail:**
- `POST /api/admin/donations` — Body: donation fields (`campaignSlug`, `amount`, `numberOfTrees`, `donorName`, `donorEmail`, etc.). Resolves tenant via `resolveTenantFromRequest`, uses `org.donationRefPrefix`/`org.treePrice` to generate `refId`/`receiptNumber` — the one donation-writing route that is org-aware. Response: `{success, donation, refId, receiptNumber}`. Errors: 400/401/404/500.
- `PATCH /api/admin/donations` — Body: `{donationId, ...updates}` (allow-listed fields). Response: `{success, donation}`. **Does not re-check `orgId`** — an admin from one org could patch another org's donation by ID once multi-tenancy is enforced elsewhere.
- `DELETE /api/admin/donations` — Body: `{donationId}`. Response: `{success:true}`.
- `POST /api/admin/donations/bulk` — Body: `{rows: any[]}` (raw CSV rows keyed by column header, e.g. `'Donor Name'`). Response: `{success, created, skipped, errors[]}`. No zod validation; hardcodes `refId` prefix `#JITO-` and `receiptNumber` prefix `JGL` instead of org config; loops with per-row `count()` calls (N+1 + race condition on ref numbering).
- `POST /api/admin/donations/send-email` — Body: `{donationId, type}`. Response: `{success:true}` / 400/404/500.
- `GET /api/admin/dashboard` — Response: `{stats:{totalAmount, totalTrees, totalDonations, farmerCount, siteCount, treesPlanted, plannedTrees, totalArea, assignmentCount}, recentDonations, recentSites}`. Global across all orgs (no `orgId` filter).

## 2. Admin — Farmers, Users, Logs

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/api/admin/farmers` | List/search/paginate farmers | 🛡️ ADMIN **only** (excludes SUPER_ADMIN — likely a bug) |
| PATCH | `/api/admin/farmers` | Approve/update farmer status or assigned officer | 🛡️ ADMIN only |
| GET | `/api/admin/users` | List/paginate web users | 🛡️ ADMIN/SUPER_ADMIN |
| POST | `/api/admin/users` | Create a new user | 🛡️ ADMIN/SUPER_ADMIN |
| PATCH | `/api/admin/users` | Toggle active/lock, reset password, change role, or general update | 🛡️ ADMIN/SUPER_ADMIN |
| DELETE | `/api/admin/users` | Soft-delete a user (blocked for deleting a SUPER_ADMIN unless actor is SUPER_ADMIN) | 🛡️ ADMIN/SUPER_ADMIN |
| GET | `/api/admin/logs` | Paginated audit log viewer | 🛡️ ADMIN/SUPER_ADMIN |
| POST | `/api/admin/agreements` | Generate a farmer legal document | ⚠️ intended ADMIN/SUPER_ADMIN |
| GET | `/api/admin/agreements` | List farmer agreements | ⚠️ **auth check error is silently swallowed (`.catch(() => {})`) — effectively public** |
| PATCH | `/api/admin/agreements` | Update agreement status/notes | 🛡️ ADMIN/SUPER_ADMIN |

**Request/response detail:**
- `GET /api/admin/farmers?status=&district=&search=&page=` → `{farmers, total, page, pages}`.
- `PATCH /api/admin/farmers` — Body: `{farmerId, status, assignedOfficerId}`. Response: `{success, farmer}`. `status` is cast `as any` with no application-level enum validation before the Prisma call.
- `GET /api/admin/users?...` → `{users, total, page, pages}`.
- `POST /api/admin/users` — Body: `{name, email, mobile, password, role}`, bcrypt(12)-hashed. Response: `{success, user}`.
- `PATCH /api/admin/users` — Body: `{userId, action}` where `action` ∈ `toggle_active|toggle_lock|reset_password|change_role|<general update>`. No allow-list restricting *which* roles an ADMIN (vs SUPER_ADMIN) may assign — an ADMIN can promote a user to SUPER_ADMIN.
- `DELETE /api/admin/users` — Body: `{userId, reason}`.
- `GET /api/admin/logs?actorId=&farmerId=&action=&page=` → `{logs, total, page, pages}`. Not scoped by org.
- `POST /api/admin/agreements` — Body: `{farmerId, agreementType, templateData}`. Response: `{success, agreement}` / 400/404.
- `PATCH /api/admin/agreements` — Body: `{agreementId, status, notes}`.

## 3. Admin — Plantation Sites (Master Data & Operations)

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/api/admin/plantation-sites` | List sites (filterable by project/phase/search) | ⚠️ **no auth check at all** |
| POST | `/api/admin/plantation-sites` | Create a site + species plans | 🛡️ ADMIN/SUPER_ADMIN/PROJECT_MANAGER |
| GET | `/api/admin/plantation-sites/[id]` | Site detail incl. farmer names/mobiles/GPS | ⚠️ **no auth check — PII exposed publicly** |
| PATCH | `/api/admin/plantation-sites/[id]` | Update site (25 allow-listed fields) | ⚠️ **any logged-in session, no role check** |
| DELETE | `/api/admin/plantation-sites/[id]` | Deactivate a site | 🛡️ ADMIN/SUPER_ADMIN |
| GET | `/api/admin/plantation-sites/[id]/activities` | List logged field activities | ⚠️ no auth check |
| POST | `/api/admin/plantation-sites/[id]/activities` | Log a field activity | 🔑 any session, no role check |
| GET | `/api/admin/plantation-sites/[id]/assignments` | List farmer↔site land assignments (incl. farmer PII) | ⚠️ no auth check |
| POST | `/api/admin/plantation-sites/[id]/assignments` | Assign farmer land to a site | 🔑 any session, no role check |
| PATCH | `/api/admin/plantation-sites/[id]/assignments` | Update assignment stage/progress | 🔑 any session, no role check |
| GET | `/api/admin/plantation-sites/[id]/dashboard` | Per-site analytics (survival %, species mix, monthly progress, farmer progress) | ⚠️ **no auth check at all** |
| GET | `/api/admin/plantation-sites/[id]/documents` | List site documents | ⚠️ no auth check |
| POST | `/api/admin/plantation-sites/[id]/documents` | Register a document (metadata only, no upload handling) | 🔑 any session, no role check |
| DELETE | `/api/admin/plantation-sites/[id]/documents` | Delete a document | 🔑 any session, no role check; also doesn't verify the document belongs to `[id]` |
| GET | `/api/admin/plantation-sites/[id]/monitoring` | List monitoring visits | ⚠️ no auth check |
| POST | `/api/admin/plantation-sites/[id]/monitoring` | Log a monitoring visit | 🔑 any session, no role check |

**Request/response detail (representative):**
- `POST /api/admin/plantation-sites` — Body: full site object (location, team, targets, budget) + `speciesPlans[]`. Auto-generates `siteCode` as `JGL-XXXXXX-1234` (hardcoded `JGL` prefix). Response: `{success, site}`.
- `PATCH /api/admin/plantation-sites/[id]` — Body: 25 allow-listed fields. Response: `{success, site}`.
- `GET /api/admin/plantation-sites/[id]` → `{site: {...relations, timelineEvents, siteDocuments, carbonMonitoring: null, notifications: []}}` — `carbonMonitoring`/`notifications` are stubbed literals, not real queries.
- `POST /api/admin/plantation-sites/[id]/activities` — Body: `{date, activityType, description, team, workers, speciesPlanted[], treesPlanted, photos[], documents[], remarks, assignmentId, driveLink, treesSurviving}`. Contains a fallback retry when a Prisma create fails on newer columns (`speciesPlanted`/`driveLink`) — evidence of schema drift between code and deployed DB.
- `POST /api/admin/plantation-sites/[id]/assignments` — Body: `{farmerId, landId, treesAssigned, speciesAlloc, plantationDate, remarks}`. Validates capacity via a hardcoded `800 trees/acre` business rule.
- `PATCH /api/admin/plantation-sites/[id]/assignments` — Body: `{assignmentId, stage, treesPlanted, treesSurviving, remarks, photos}`.
- `GET /api/admin/plantation-sites/[id]/dashboard` → `{summary, speciesBreakdown, monthlyProgress, farmerProgress, latestVisit}`.
- `POST /api/admin/plantation-sites/[id]/documents` — Body: `{folder, fileName, fileUrl, fileSize}`.
- `POST /api/admin/plantation-sites/[id]/monitoring` — Body: `{assignmentId, farmerId, visitDate, officerId, survivalCount, deadTrees, diseaseNotes, avgHeight, photos, gpsLat, gpsLng, recommendations}`.

## 4. Auth

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET, POST | `/api/auth/[...nextauth]` | NextAuth.js catch-all (Credentials provider, JWT session) | 🔓 public (this is the auth provider itself) |
| POST | `/api/auth/register` | Register a new donor/admin web account | 🔓 public |
| POST | `/api/auth/forgot-password` | 3-step (send/verify/reset) OTP-based password reset for web users | 🔓 public |

**Request/response detail:**
- `POST /api/auth/register` — Body (zod): `{name (min 2), email, mobile?, password (min 8)}`. Response: `{success, userId}` / 400. Duplicate-email checked; bcrypt(12); no email verification step; new users get `orgId: null`.
- `POST /api/auth/forgot-password` — Body: `{action:'send'|'verify'|'reset', email, otp?, newPassword?}`. Response: `{success, message, devOtp?}` (dev OTP only returned when `NODE_ENV !== 'production'`). Does not reveal whether an email exists (good practice). No rate limiting on OTP send. Hardcodes `"JITO Green Legacy"` in the email subject/body regardless of org.

## 5. Public Donation Flow

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/api/campaigns` | List active donation campaigns | 🔓 public |
| POST | `/api/payment/create-order` | Create Razorpay order + PENDING donation | 🔓 public (session optional, for guest checkout) |
| POST | `/api/payment/verify` | Verify Razorpay signature, mark donation COMPLETED, create trees/receipt/certificate, send email | 🔓 public |
| POST | `/api/payment/webhook` | Razorpay server-to-server webhook (`payment.captured`/`payment.failed`) | 🔓 public, HMAC-signature-verified |
| GET | `/api/donations/[id]` | Fetch a single donation's detail | 🔓 **public, no ownership check** |
| GET | `/api/certificates/[id]/pdf` | Render an HTML certificate for a donation (misnomer — HTML not true PDF; relies on browser print) | 🔓 **public, no ownership check** |
| GET | `/api/receipts/[id]/pdf` | Render an HTML donation receipt | 🔓 **public, no ownership check** |

**Request/response detail:**
- `POST /api/payment/create-order` — Body (zod): `{amount, numberOfTrees, campaignSlug, donorName, donorEmail, donorMobile?, donorAddress?, donorPan?, certificateName?, dedicationName?, dedicationType?, chapter?}`. Response: `{orderId, donationId, amount, currency:'INR'}` / 404 (campaign not found) / 500. Does not set `orgId` on the created donation (inconsistent with the admin manual-entry route).
- `POST /api/payment/verify` — Body: `{razorpay_order_id, razorpay_payment_id, razorpay_signature, donationId}`. Response: `{success, donationId}` / `{success:false, error:'Invalid signature'}` (400). Trusts client-supplied `donationId` without cross-checking it against the order's stored `paymentOrderId` before marking COMPLETED — see [CODE_REVIEW.md](CODE_REVIEW.md) for the payment-integrity risk this creates. Hardcodes `expectedCO2: 22` kg/tree/year.
- `POST /api/payment/webhook` — Raw Razorpay JSON body; verifies `x-razorpay-signature` HMAC before acting. Response: `{received:true}` / `{error:'Invalid signature'}` (400).
- `GET /api/donations/[id]` → `{donation}` (includes `campaign`, `trees`, and unredacted `donorPan`/`donorMobile`/`donorAddress`) / 404.
- `GET /api/certificates/[id]/pdf` and `GET /api/receipts/[id]/pdf` → `text/html` content / 404. Neither reads org branding — receipt/certificate content is generated by the fully-hardcoded `src/lib/pdf.ts` templates regardless of tenant.

## 6. Contact & CSR

| Method | Route | Purpose | Auth |
|---|---|---|---|
| POST | `/api/contact` | Public "contact us" form submission | 🔓 public (by design) |
| GET | `/api/contact` | List past contact inquiries | ⚠️ **intended admin-only per code comment, but has zero auth check — public PII leak** |
| POST | `/api/csr-inquiry` | Corporate CSR partnership inquiry | 🔓 public |

**Request/response detail:**
- `POST /api/contact` — Body (zod): `{name (min 2), mobile (min 10), email, subject, message (min 5)}`. Response: `{success:true}` / 400. Stored via the generic `AuditLog` table (no dedicated model); emails a hardcoded recipient `mumbaizoneJES@jito.org` regardless of org.
- `GET /api/contact` → `{inquiries: logs}` (up to 100 records) — no auth.
- `POST /api/csr-inquiry` — Body: unvalidated (`await req.json()`, no zod schema). Response: always `{success:true}`. **Stub implementation** — the request body is only `console.log`'d; nothing is persisted or emailed (comment: `// In production: save to DB and send email`).

## 7. Farmer Portal

| Method | Route | Purpose | Auth |
|---|---|---|---|
| POST | `/api/farmer/otp` | Send OTP to a mobile number (MSG91 → Twilio → dev-log fallback chain) | 🔓 public |
| PUT | `/api/farmer/otp` | Verify OTP, issue login token | 🔓 public |
| POST | `/api/farmer/login` | Password or OTP login; forgot/reset sub-actions | 🔓 public |
| POST | `/api/farmer/register` | Multi-step registration/profile upsert, generates Farmer ID + GIS ID | 🔓 public |
| GET | `/api/farmer/profile` | Farmer profile + lands + documents + stats | ⚠️ **trusts client-supplied `farmerId`/`mobile`, no token verification** |
| PATCH | `/api/farmer/profile` | Edit profile incl. bank/nominee details | ⚠️ **same — no ownership check** |
| GET | `/api/farmer/land` | List a farmer's land parcels | ⚠️ same |
| POST | `/api/farmer/land` | Register a new land parcel | ⚠️ same |
| PATCH | `/api/farmer/land` | Update land details | ⚠️ same |
| GET | `/api/farmer/documents` | List a farmer's uploaded documents | ⚠️ same |
| POST | `/api/farmer/documents` | Save a document record | ⚠️ same |
| DELETE | `/api/farmer/documents` | Delete a document (partially mitigated — filters by `{id, farmerId}` compound) | ⚠️ weak IDOR mitigation only |
| GET | `/api/farmer/agreements` | List a farmer's legal documents | ⚠️ same |
| PATCH | `/api/farmer/agreements` | Acknowledge or upload a signed agreement | ⚠️ same |
| GET | `/api/farmer/agreements/[id]` | Render one agreement as printable HTML (contains Aadhaar, survey number, etc.) | 🔓 **public, no auth** |

**Critical cross-cutting finding**: The farmer "session" is an **unsigned base64 token** (`Buffer.from(JSON.stringify({...})).toString('base64')`, produced by both `farmer/login` and `farmer/otp` PUT). No route ever verifies this token — every farmer-scoped endpoint simply trusts whatever `farmerId`/`mobile` the client sends in the query string or JSON body. This is a systemic IDOR/broken-authentication issue affecting ~8 route files; see [CODE_REVIEW.md](CODE_REVIEW.md) §Security for full detail.

**Request/response detail (representative):**
- `POST /api/farmer/otp` — Body: `{mobile}`. Response: `{success, smsSent, message, devOtp?}` — `devOtp` is exposed whenever SMS-provider credentials are absent, **regardless of `NODE_ENV`** (a distinct, more dangerous gate than the web forgot-password route's `NODE_ENV` check).
- `PUT /api/farmer/otp` — Body: `{mobile, otp}`. Response: `{success, token, farmerId, isProfileComplete}`.
- `POST /api/farmer/login` — Body: `{action, mobile, password?, otp?, newPassword?}`. Response: `{success, token, farmerId, farmerName}` / 400/401/404. No lockout/rate-limit on repeated attempts (unlike the `User.isLocked`/`loginAttempts` mechanism that exists for web users but has no `Farmer` equivalent).
- `POST /api/farmer/register` — Body (zod, ~25 fields): personal/bank/nominee info, `registrationStep`, optional `password`. Response: `{success, farmerId, farmerIdGenerated, gisId, status}` / 400. `upsert` keyed on `mobile` globally (not scoped per-org) — a design conflict for multi-tenancy if two orgs' farmers might share a mobile number.
- `GET /api/farmer/profile?farmerId=` → `{farmer:{...,lands,documents}, stats:{totalLandAcres, totalTreesPlanted:0, totalTreesSurviving:0, totalRevenue:0, totalCO2:0}}` — note the `stats` fields other than `totalLandAcres` are **hardcoded to 0**, never actually computed.
- `PATCH /api/farmer/profile` — Body: `{farmerId, ...~20 allow-listed fields including bankAccountName/accountNumber/ifscCode/nomineeAadhaar}` — combined with the missing-ownership-check issue above, this allows redirecting another farmer's bank details with only their `farmerId`.
- `POST /api/farmer/land` — Body (zod, ~20 fields): `surveyGutNumber, areaAcres, gpsLatitude/Longitude, polygonGeoJson, ownershipType, speciesPreference[]`, etc. — the best-validated route in the farmer group.
- `GET/POST/DELETE /api/farmer/documents` — Body: `{farmerId, docType, fileUrl, fileName, fileSize, landId}` / `{documentId, farmerId}`.
- `GET /api/farmer/agreements/[id]` → raw HTML (injects `agreement.generatedHtml` unescaped — currently server-generated content only, so not actively exploitable, but a latent XSS-shaped risk if that ever changes).

## 8. Field Officer

| Method | Route | Purpose | Auth |
|---|---|---|---|
| POST | `/api/field-officer/inspect` | Submit a site/land inspection report | ⚠️ **no auth check — `officerId` trusted from body** |
| GET | `/api/field-officer/inspect` | List inspections (filterable by farmer/officer) | ⚠️ no auth check |

**Request/response detail:**
- `POST` — Body (zod): `{farmerId, landId?, officerId, scheduledDate?, inspectedAt?, gpsLatitude?, gpsLongitude?, ownershipVerified, boundaryVerified, farmerMetPersonally, plantationFeasible, waterSourceAvailable, notes?, photos?[], status}`. Response: `{success, inspectionId}` / 400. Writes farmer status transitions and audit-log entries attributed to `actorId: data.officerId` — an unauthenticated caller can forge inspection reports and audit entries under any officer's identity.
- `GET ?farmerId=&officerId=` → `{inspections}` (includes farmer/officer/land selects).

## 9. Public Tenant Config

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/api/public/org-config` | Returns the current tenant's public branding (name, colors, logo, contact, tree price, plan) | 🔓 public by design |

**Request/response detail**: No params — org resolved server-side from `x-org-id` header / custom domain / subdomain via `resolveTenantFromRequest`. Response: `{id, name, slug, primaryColor, logoUrl, email, phone, website, treePrice, plan}` with `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`. **This is the best-designed, most consistently org-aware route in the codebase** — it explicitly excludes secrets (`paymentBanks`, `farmerIdPrefix`, `donationRefPrefix`, `campaignConfig`) and is the pattern other public routes should follow during SaaS migration.

## 10. Superadmin — Organization (Tenant) Management

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/api/superadmin/orgs` | List all tenant organizations with per-org donation/farmer/site counts | 🛡️ SUPER_ADMIN only |
| POST | `/api/superadmin/orgs` | Create a new organization (tenant) | 🛡️ SUPER_ADMIN only |
| GET | `/api/superadmin/orgs/[id]` | Single org detail | 🛡️ SUPER_ADMIN only |
| PATCH | `/api/superadmin/orgs/[id]` | Update org settings, invalidates tenant cache | 🛡️ SUPER_ADMIN only |
| DELETE | `/api/superadmin/orgs/[id]` | Soft-deactivate an org (blocked for the seed org `org_jito_mumbai`) | 🛡️ SUPER_ADMIN only |

**Request/response detail:**
- `POST /api/superadmin/orgs` — Body (camelCase): `{name, slug, primaryColor, logoUrl, email, phone, address, website, farmerIdPrefix, donationRefPrefix, treePrice, org80gNumber, paymentBanks, campaignConfig, customDomain, plan}`. Response: `{success, org}` / 400 (`name and slug required`, `Slug already taken`).
- `PATCH /api/superadmin/orgs/[id]` — Body uses **snake_case** field names (`primary_color`, `logo_url`, `org_80g_number`) — inconsistent with the POST route's camelCase, a real integration bug risk. Calls `invalidateOrgCache(id)` after update.
- `DELETE /api/superadmin/orgs/[id]` — Hardcoded guard: `if (id === 'org_jito_mumbai') return 400` ("Cannot deactivate the primary organization").
- `GET /api/superadmin/orgs` → `{orgs: [...with _counts:{donations, farmers, sites}]}` — computed via a `Promise.all` of 3 count queries per org (N+1-shaped; fine at low tenant counts, should become a grouped aggregate as tenant count grows).

## Summary — Authorization Matrix

| Access level | Routes |
|---|---|
| Public, no auth | `campaigns` GET · `certificates/[id]/pdf` GET · `contact` POST *and* GET (bug) · `csr-inquiry` POST · `donations/[id]` GET · all `farmer/*` (no real enforcement) · `field-officer/inspect` both methods (no enforcement) · `payment/create-order`/`verify`/`webhook` · `public/org-config` GET · `receipts/[id]/pdf` GET · `auth/register`, `auth/forgot-password` · `admin/plantation-sites*` GET endpoints (bug — missing checks) |
| Any session, no role check | `admin/plantation-sites/[id]` PATCH (bug) · `admin/plantation-sites/[id]/activities` POST · `.../assignments` POST/PATCH · `.../documents` POST/DELETE · `.../monitoring` POST |
| ADMIN only | `admin/farmers` GET/PATCH |
| ADMIN or SUPER_ADMIN | `admin/dashboard` · `admin/donations*` · `admin/export-csv` · `admin/logs` · `admin/plantation-sites` POST (also PROJECT_MANAGER) · `admin/plantation-sites/[id]` DELETE · `admin/users*` · `admin/agreements` (GET auth is bypassed by a bug) |
| SUPER_ADMIN only | `superadmin/orgs*` |

## Summary — Tenant/Org-Awareness

Only **3 of 39** route files are genuinely org-aware: `admin/donations` POST (partial), `public/org-config` GET (complete), and `superadmin/orgs*` (complete, by definition of their purpose). Every other route — including all of `admin/farmers`, `admin/plantation-sites*`, `admin/users`, `admin/logs`, `farmer/*`, `field-officer/*`, and the public donation flow — queries or writes Prisma models with **no `orgId` filter**, even though `orgId` already exists as an optional column on `User`, `Campaign`, `Donation`, `MasterProject`, `PlantationSite`, and `Farmer`. This is the central, repeated finding across this analysis and is the primary blocker for onboarding a second tenant — see [SAAS_MIGRATION_PLAN.md](SAAS_MIGRATION_PLAN.md).
