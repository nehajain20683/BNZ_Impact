# System Architecture — JITO Green Legacy Platform

## 1. Frontend Architecture

**Framework**: Next.js 14 App Router. There is no `src/pages` directory in active use (Tailwind's content glob still references it defensively, but no files exist there) — everything routes through `src/app`.

**Component model**: The large majority of pages are **Client Components** (`'use client'` at the top) using local `useState`/`useEffect` and direct `fetch()` calls to the app's own API routes — this is a "thick client, thin server" pattern rather than React Server Components fetching data server-side. Exceptions that *are* server components: `src/app/dashboard/page.tsx`, `src/app/admin/farmers/page.tsx`, `src/app/admin/logs/page.tsx`, `src/app/impact/page.tsx` (with `revalidate=60`), and the static legal pages (`privacy-policy`, `refund-policy`, `terms`, `about`) — these query Prisma directly rather than via an API route.

**Routing structure**:
- Flat, file-system-based routes under `src/app/*` for the public/donor site.
- Two **route groups** exist purely to scope layout wrapping without affecting the URL: `(tenant)` and `(superadmin)`.
- `src/middleware.ts` gates four path prefixes (`/sadmin`, `/superadmin` [legacy redirect to `/sadmin`], `/admin`, `/dashboard`) by NextAuth JWT + role. **Farmer routes (`/farmer/*`) and the DMRV admin sub-routes are not in the middleware matcher** — DMRV pages inherit protection only because they live under `/admin/*`; farmer pages have no server-side route protection at all and rely entirely on a client-side `localStorage` check that redirects to `/farmer/login` if absent (not a real security boundary, just a UX guard).

**Layout hierarchy**:
```
src/app/layout.tsx (root — hardcoded <title>/meta, wraps everything in ClientLayout)
 └─ ClientLayout.tsx (client — branches on pathname)
     ├─ if pathname starts with /sadmin or /superadmin:
     │    SessionProvider → dark shell (no Navbar/Footer/OrgConfigProvider)
     │    └─ (superadmin)/layout.tsx → SuperAdminProviders (SessionProvider only)
     │         └─ withSuperAdmin(Component) HOC → SuperAdminLayout (sidebar/topbar chrome)
     └─ else (tenant site):
          SessionProvider → OrgConfigProvider → Navbar → {page} → Footer
          └─ (tenant)/layout.tsx (empty passthrough — real wiring is in ClientLayout above it)
```
`src/components/layout/Providers.tsx` is an explicitly-marked-deprecated duplicate of this wiring, kept only for backward compatibility.

**State management**: No global state library (no Redux/Zustand/Jotai). State is either (a) NextAuth's `SessionProvider` context for auth, (b) `OrgConfigProvider`'s React Context for tenant branding (`useOrgConfig()`), or (c) local component `useState`/`react-hook-form`. Multi-step forms (farmer registration, land registration) persist intermediate state to `localStorage` and, server-side, to `Farmer.draftData` JSON.

**Authentication flow (frontend)**:
- Donor/Admin/SuperAdmin: `next-auth/react`'s `signIn('credentials', {redirect:false})` → JWT cookie → `useSession()` reads `session.user.role`/`id` (injected via the `jwt`/`session` callbacks in `src/lib/auth.ts`).
- Farmer: custom OTP or password flow against `/api/farmer/login` / `/api/farmer/otp`, storing an **unsigned** token + `farmerId` + `farmerName` in `localStorage` — not a cookie, not verified by any subsequent API call (see [CODE_REVIEW.md](CODE_REVIEW.md)).
- Field Officer: has a Prisma model and password field but no visible frontend login page was found under `src/app/field-officer/` — the portal appears unimplemented.

**API communication**: Client components call the app's own `/api/*` routes via `fetch`; no dedicated API client/SDK layer (no generated client, no React Query/SWR) — each page manages its own loading/error state manually.

**UI libraries**: Tailwind CSS (utility classes, no component library like shadcn/MUI), `lucide-react` for icons, `framer-motion` for animation, `recharts` for the few real charts that exist (DMRV pages instead hand-roll SVG bar/spark-line charts), `react-hook-form` used inconsistently (present in `package.json`, but several forms — e.g. the multi-step farmer wizard — use raw `useState` instead).

**Theme management**: A single CSS custom property, `--brand-primary` (plus a derived `--brand-primary-hsl`), is set at runtime by `OrgConfigProvider` after fetching `/api/public/org-config`. Tailwind's static config (`tailwind.config.ts`) separately defines a hardcoded `sage`/`forest`/`cream` color palette used throughout the Tailwind class names in JSX — meaning **most of the visual theme is compiled-in Tailwind classes, and only a narrow slice (whatever explicitly references the CSS var) actually changes per tenant**. The DMRV module and PDF/email templates do not consume the CSS var at all.

**Branding implementation & hardcoded values**: Covered exhaustively in [BRANDING_ANALYSIS.md](BRANDING_ANALYSIS.md) — summary: `Navbar`/`Footer`/`email.ts`/`farmer-id.ts` are properly org-aware; nearly everything else (root metadata, homepage/about/donate/success page copy, all PDF/legal-document templates, legal pages, DMRV theme) hardcodes JITO branding directly.

**Reusable components**: The component library is thin — `Navbar`, `Footer`, `OrgConfigProvider`, `ClientLayout`/`TenantProviders`/`Providers` (layout shells), `AdminSignOut`, `DMRVLayout`, `SuperAdminLayout`, `withSuperAdmin` (auth HOC). There is no shared form-input, button, card, modal, or toast component — each page defines its own local Tailwind class-string constants and modal markup, leading to the duplication noted in [CODE_REVIEW.md](CODE_REVIEW.md).

## 2. Backend Architecture

**Framework**: Next.js App Router **Route Handlers** (`src/app/api/**/route.ts`), each deployed as an individually-invoked Vercel serverless function (`export const runtime = 'nodejs'` is set throughout since Razorpay/Puppeteer/bcrypt require the Node runtime, not Edge).

**Folder structure**: There is no separate "controller/service/repository" layering — each `route.ts` file is a single flat module containing request parsing, authorization check (where present), Prisma queries, and response shaping all inline. `src/lib/*.ts` functions serve as the closest thing to a "service layer" (`razorpay.ts`, `email.ts`, `pdf.ts`, `farmer-id.ts`, `tenant.ts`), but they are utility functions, not injected/testable services — there is no dependency-injection container, and nothing is unit-tested (no test files were found in the repository).

**"Controllers"**: The 39 `route.ts` files themselves, one per resource/action combination, following REST-ish conventions (GET list, POST create, PATCH update, DELETE remove) but not strict REST (e.g., several "update" operations take an ID in the request body rather than the URL path segment, such as `PATCH /api/admin/donations` taking `{donationId}` in the body rather than using `/api/admin/donations/[id]`).

**"Services"**: `src/lib/razorpay.ts` (payment gateway), `src/lib/email.ts` (Resend wrapper), `src/lib/pdf.ts` + `src/lib/doc-templates.ts` + `src/lib/generate-pdf.ts` (document generation), `src/lib/farmer-id.ts` (ID generation), `src/lib/tenant.ts` + `src/lib/org-config.ts` (tenant resolution/branding).

**"Modules"**: Best understood as informal groupings by URL prefix rather than a formal module system: `admin/*`, `auth/*`, `farmer/*`, `field-officer/*`, `payment/*`, `superadmin/*`, plus a handful of top-level public routes (`campaigns`, `contact`, `csr-inquiry`, `donations`, `certificates`, `receipts`, `public/org-config`).

**Authentication (backend)**: NextAuth v4 with a Credentials provider (`src/lib/auth.ts`) — email+password checked against `User.password` via `bcrypt.compare`, JWT session strategy (not database sessions, despite `Session`/`Account` tables existing from the Prisma Adapter). The `jwt`/`session` callbacks inject `role` and `id` onto the token/session object, which is what every role check in every route reads via `getServerSession(authOptions)`.

**Authorization**: Implemented ad hoc per route as `if (!role || !['ADMIN','SUPER_ADMIN'].includes(role)) return 401/403`, sometimes as an inline check, sometimes via a locally-defined `requireAdmin()`/`requireSuperAdmin()` helper duplicated per route file (not a single shared middleware/guard function). As catalogued in [API_DOCUMENTATION.md](API_DOCUMENTATION.md) and [CODE_REVIEW.md](CODE_REVIEW.md), this ad hoc approach has produced real inconsistencies: some GET routes have no check at all, some POST/PATCH routes only check for a session without a role, and the `admin/agreements` GET check is bypassed entirely by an error-swallowing bug. There is no centralized authorization guard/decorator — this is the single largest backend architectural gap relative to the auth model's apparent intent.

**Middleware**: Only `src/middleware.ts` (page-route protection, described in §1). No API-level middleware exists (Next.js Route Handlers don't compose middleware the way Express does; there is no shared "require role X" wrapper reused across API routes — each file reimplements its own check).

**Guards**: None in the NestJS/Angular sense. The closest analogues are the per-route inline session checks (backend) and `withSuperAdmin()` (frontend HOC).

**Validation**: Inconsistent. Some routes use `zod` schemas thoroughly (`auth/register`, `farmer/land`, `farmer/register`, `payment/create-order`, `field-officer/inspect`); others do no validation at all and pass raw `await req.json()` fields straight to Prisma with unsafe `as any` casts (`csr-inquiry`, parts of `admin/farmers` PATCH, `admin/users` PATCH `change_role`).

**API architecture**: REST-over-HTTP via Next.js Route Handlers, JSON request/response bodies, no GraphQL, no versioning (`/api/v1/...` is not used — a breaking API change would affect all clients immediately with no migration path).

**Error handling**: Almost universally `try { ... } catch (e: any) { return NextResponse.json({error: e.message}, {status: 500}) }` — functional but leaks internal error text (including raw Prisma constraint-violation messages) to API clients, and provides no structured error codes for frontend clients to branch on.

**Logging**: `console.log`/`console.error` only (e.g., OTP codes logged in dev, payment/email failures logged on catch). Prisma's own query logging is enabled in development (`src/lib/prisma.ts`: `log: ['query','error','warn']` in dev, `['error']` in production). There is no structured/centralized logging (no Sentry, no Datadog, no request-ID correlation) — troubleshooting a production incident would rely entirely on Vercel's function logs.

## 3. Database Architecture

See [DATABASE_DOCUMENTATION.md](DATABASE_DOCUMENTATION.md) for the full schema, ER diagram, and migration-integrity findings (notably: only one migration exists, and substantial schema drift has been applied via hand-written SQL rather than `prisma migrate`).

## 4. Authentication & Authorization — Consolidated

| Aspect | Web Users (Donor/Admin/SuperAdmin) | Farmers | Field Officers |
|---|---|---|---|
| **Login mechanism** | NextAuth Credentials provider, email+password, `bcrypt.compare` | Custom: mobile+password OR mobile+OTP (`farmer/login`, `farmer/otp`) | Email+password field exists on `FieldOfficer` model; no login route/page found in the reviewed surface |
| **Session** | JWT cookie (NextAuth), `session.user.{role,id}` | Unsigned base64 token in `localStorage`, never re-verified server-side | Not established (no session artifact found) |
| **Roles** | `Role` enum: DONOR, ADMIN, SUPER_ADMIN, FIELD_OFFICER, DATA_ENTRY, PROJECT_MANAGER, AUDITOR (enum includes roles with no corresponding login/portal — `FIELD_OFFICER`/`DATA_ENTRY`/`AUDITOR` have no dedicated sign-in flow of their own; `FieldOfficer` is in fact a *separate* Prisma model from `User`, so the `Role.FIELD_OFFICER` enum value is currently unused by any actual `User` row in practice) | No role field — a `Farmer` is a single fixed type of principal, status-gated (`FarmerStatus`) rather than role-gated | No role/permission field beyond the model's existence |
| **Permissions** | Enforced ad hoc per API route (see §2) via string-array role checks; no permission table, no RBAC beyond the fixed enum | Enforced only at the UI redirect level (`localStorage` presence check); **not enforced server-side** | Not enforced (no auth check found on the one API route it touches) |
| **Password reset** | OTP-via-email, `resetOtpHash`/`resetOtpExpiry` fields, `/api/auth/forgot-password` | OTP-via-SMS within `farmer/login`'s forgot/reset sub-actions | Not implemented |
| **Account lockout** | `isLocked`/`loginAttempts` fields exist on `User` | No equivalent fields on `Farmer` | N/A |

**Session handling detail**: NextAuth is configured with `session: { strategy: 'jwt' }`, meaning the `Session`/`Account` Prisma tables (present because `@next-auth/prisma-adapter` is wired in) are effectively **dead weight** in the current configuration — they'd only be populated if a database-session strategy or an OAuth provider were active, and neither is true today (only `CredentialsProvider` is configured).

## 5. Configuration

| Category | Details |
|---|---|
| **Environment variables** (from `.env.example`) | `DATABASE_URL` (Supabase PgBouncer transaction-pooler URL, port 6543), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RESEND_API_KEY`, `FROM_EMAIL`, `FROM_NAME`. Additional vars referenced in code but absent from `.env.example`: `MSG91_AUTH_KEY`/similar and `TWILIO_*` (SMS OTP providers, per the API research), `DIRECT_URL` (mentioned in `DEPLOYMENT.md` for direct/non-pooled migrations but commented out in `schema.prisma`). |
| **Secrets** | Managed via `.env`/`.env.local` (gitignored, presumed — not committed) plus Vercel's environment-variable dashboard for production, per `DEPLOYMENT.md`. No secrets manager (Vault/AWS Secrets Manager) is used; this is standard for a project of this size but worth flagging if regulatory/enterprise tenants (government bodies, corporates) are onboarded later. |
| **Build configuration** | `next.config.js`: `serverExternalPackages` for Puppeteer/Chromium/bcrypt (keeps them out of the webpack bundle), remote image allowlist (Unsplash, Cloudinary), `optimizePackageImports` for `lucide-react`/`recharts`, and — notably — **both `eslint.ignoreDuringBuilds` and `typescript.ignoreBuildErrors` set to `true`**, meaning the production build will succeed even with type errors or lint violations. |
| **Deployment configuration** | `vercel.json` sets per-route function overrides: `payment/webhook` (30s), `payment/verify` (60s, 1024MB — the highest of any route, presumably to accommodate the trees/receipt/certificate/email cascade that happens synchronously on verify), `payment/create-order` (30s), `certificates/[id]/pdf` and `receipts/[id]/pdf` (30s each, for Puppeteer/Chromium cold starts). |
| **Prisma configuration** | Single `datasource db` block (PostgreSQL), `directUrl` commented out (only needed if pgbouncer requires a separate migration connection — currently unused, meaning migrations are run against the same pooled URL per the current config, contradicting `DEPLOYMENT.md`'s own recommendation to use a direct connection for `prisma migrate deploy`). `prisma generate` runs automatically via the `postinstall` script. |
| **Local bootstrap** | `setup.bat`/`setup.ps1` — Windows-oriented convenience scripts (not reviewed in depth; inferred from filenames and `package.json` scripts to wrap `npm install` + `prisma generate` + `.env` setup). |

## 6. Proposed Architecture for BNZ Impact

See [SAAS_MIGRATION_PLAN.md](SAAS_MIGRATION_PLAN.md) §"Suggested Architecture" for the full proposal (multi-tenancy model, white-label branding pipeline, org-specific domains, Super Admin / Org Admin / Member Portal separation, configurable modules, feature flags) and §"Migration Strategy" for how to get there in phases from the architecture described above.
