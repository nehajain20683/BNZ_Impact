# Project Overview — JITO Green Legacy Platform

> This document, and the seven companion documents in this `docs/` folder, are a read-only architectural analysis of the repository as it exists today. No application code was modified to produce them.

## 1. What This Repository Is

"JITO Green Legacy" is a single-tenant (in practice, though partially scaffolded for multi-tenancy) web platform for **JITO Mumbai Zone** that combines:

1. A public **donation/fundraising site** — donors sponsor trees (₹500/tree, themed campaigns like "Ek Ped Maa Ke Naam"), pay via Razorpay, and receive an emailed PDF receipt + certificate.
2. A **farmer/landowner onboarding module** — farmers self-register, upload KYC documents, register land parcels, and go through field-officer inspection and approval so their land can host plantation activity.
3. A **plantation-site operations & carbon dMRV (digital Measurement, Reporting & Verification) module** — admins plan sites, log field activities, run monitoring visits, and track carbon-credit methodology/registry status.
4. An early-stage **Super Admin / SaaS control panel** (`/sadmin/*`) branded "BNZ Green Technologies" for managing multiple **Organizations** (tenants) — this is the seed of the intended pivot to a multi-org product ("BNZ Impact").

## 2. Technology Stack

| Layer | Technology | Version (from `package.json`) |
|---|---|---|
| Framework | Next.js (App Router) | 14.2.18 |
| Language | TypeScript | 5.7.2 |
| UI | React | 18.3.1 |
| Styling | Tailwind CSS + `tailwindcss-animate` + `class-variance-authority` + `clsx`/`tailwind-merge` | 3.4.15 |
| Icons | lucide-react | 0.453.0 |
| Animation | framer-motion | 10.18.0 |
| Charts | recharts | 2.13.3 |
| Forms | react-hook-form | 7.53.2 |
| Validation | zod | 3.23.8 |
| ORM | Prisma | 5.22.0 |
| Database | PostgreSQL (target: Supabase, PgBouncer transaction pooler) | — |
| Auth | NextAuth.js (`next-auth`) v4 + `@next-auth/prisma-adapter`, Credentials provider, JWT sessions, bcryptjs password hashing | 4.24.10 |
| Payments | Razorpay (orders + HMAC-verified webhooks) | 2.9.5 |
| Email | Resend | 4.0.0 |
| PDF generation | Custom HTML templates rendered to PDF via `puppeteer-core` + `@sparticuz/chromium-min` (serverless-compatible headless Chrome) | 22.0.0 / ^133.0.0 |
| Hosting target | Vercel (see `vercel.json` function timeouts/memory overrides) | — |

Notably, `README.md` describes an **outdated stack** (Next.js 15, NextAuth v5, SendGrid, ₹450/tree pricing) that no longer matches `package.json` or the schema — a documentation-drift issue (see [CODE_REVIEW.md](CODE_REVIEW.md)).

## 3. Repository Structure

```
jito-green-legacy/
├── prisma/
│   ├── schema.prisma              # 26 models, 15 enums (see DATABASE_DOCUMENTATION.md)
│   ├── seed.ts                    # Seeds campaigns, admin user, sample sites, a field officer
│   └── migrations/
│       └── 20260523143756_init/   # ONLY migration — reflects the original MVP schema only
├── public/
│   ├── logos/                     # jito-logo.png, env-logo*.{jpg,png}, mumbai-zone-logo.*, bnz-logo.png
│   ├── campaigns/                 # dadi.png, maa.png, beti.png, poti.png (campaign hero art)
│   ├── sites/                     # sample plantation-site photos/polygon overlays
│   └── why/                       # "Why plant with us" section icons/imagery
├── src/
│   ├── app/                       # Next.js App Router — see below
│   ├── components/                # Shared React components (layout, admin, superadmin)
│   ├── lib/                       # Server-side helpers (auth, db, payments, email, PDF, tenant)
│   └── middleware.ts              # Route-level auth gate for /sadmin, /admin, /dashboard
├── FARMER_MODULE_SQL.sql          # Hand-written SQL run directly against Supabase (see below)
├── DEPLOYMENT.md, README.md       # Docs (partially stale)
├── setup.bat / setup.ps1          # Local environment bootstrap scripts
├── vercel.json                    # Per-function timeout/memory overrides for payment & PDF routes
├── next.config.js, tailwind.config.ts, tsconfig.json, postcss.config.js
└── .env / .env.local / .env.example
```

### `src/app` breakdown

| Path | Kind | Purpose |
|---|---|---|
| `page.tsx`, `about/`, `campaigns/`, `donate/`, `impact/`, `csr/`, `contact/`, `privacy-policy/`, `refund-policy/`, `terms/`, `certificate/`, `receipt/`, `success/` | Public marketing/donor-facing pages | Home, informational, and donation-checkout flow |
| `auth/` | Public | Login / register / forgot-password for donor+admin accounts (NextAuth Credentials) |
| `dashboard/` | Donor-authenticated | Donor's personal donation/tree history |
| `admin/` | Role-gated (ADMIN/SUPER_ADMIN via middleware) | Donation management, farmer management, plantation-site management, people/users, logs, and the 9-page `dmrv/` sub-module |
| `farmer/` | Farmer-authenticated (separate auth system from NextAuth) | Farmer dashboard, registration, land, documents, login |
| `field-officer/` | Field-officer-authenticated | (single page — inspection tooling) |
| `(tenant)` route group | Layout wrapper | Wraps the tenant-facing site in `OrgConfigProvider` (white-label theming) |
| `(superadmin)` route group | Layout wrapper | Wraps `/sadmin/*` in `SuperAdminLayout`, isolated from tenant theming |
| `superadmin/page.tsx` | Legacy | Old `/superadmin` route — middleware redirects it to `/sadmin` |
| `api/` | Route handlers | ~35 REST-style endpoints — see [API_DOCUMENTATION.md](API_DOCUMENTATION.md) |

### `src/lib` breakdown

| File | Purpose |
|---|---|
| `auth.ts` | NextAuth configuration (Credentials provider, JWT callbacks injecting `role`/`id`) |
| `prisma.ts` | Prisma Client singleton (dev hot-reload safe) |
| `tenant.ts` | Tenant resolution: reads `x-org-id` header → custom domain → subdomain → hardcoded JITO default, with a 60s in-memory cache |
| `org-config.ts` | `JITO_DEFAULTS` branding fallback object + `orgTobranding()` mapper |
| `razorpay.ts` | Razorpay client factory, order creation, HMAC signature verification (payment + webhook) |
| `email.ts` | Resend-based transactional email (donation confirmation, OTP) — partially org-aware |
| `pdf.ts` | Hardcoded-JITO HTML templates for donation receipts & certificates (embeds base64 logos) — **not** org-aware |
| `generate-pdf.ts` | HTML→PDF rendering via Puppeteer/Chromium (Vercel-aware executable resolution) |
| `doc-templates.ts` | HTML templates for farmer legal documents (participation agreement, NOC, payment receipt, sapling receipt, plantation certificate) — hardcoded JITO/Mumbai Zone text, bilingual (Hindi/English) |
| `labels.ts` | Bilingual (EN/HI) field label dictionary for farmer forms |
| `farmer-id.ts` | Generates farmer IDs using org's `farmer_id_prefix` (org-aware) with state/district codes |
| `logo-data.ts` | Auto-generated file embedding base64 PNG/JPG logos (JITO, Environment wing, Mumbai Zone, BNZ) for use in PDFs |
| `utils.ts` | `cn()` class merger, currency/CO₂ formatters, and a large **hardcoded** `BRAND`/`CAMPAIGNS`/`CAMPAIGN_PACKAGES` constant block — the single biggest concentration of JITO-specific content in the codebase |

## 4. Frontend / Backend / Shared Separation

- **Frontend**: `src/app/**/page.tsx` (App Router pages, mostly Client Components using `useState`/`useSession`/`react-hook-form`) + `src/components/**`.
- **Backend**: `src/app/api/**/route.ts` (Next.js Route Handlers running as Vercel serverless functions) + `src/lib/**` server-only helpers.
- **Shared**: Because this is a single Next.js app (not a monorepo), "shared" code is simply anything imported by both frontend and backend — primarily TypeScript types inferred from Prisma, and `src/lib/utils.ts` constants (`BRAND`, `CAMPAIGNS`, etc.) which are imported directly into client components, meaning JITO branding is compiled into the client bundle rather than fetched at runtime for most of the UI (contrast with `OrgConfigProvider`, which *does* fetch branding at runtime for a narrower set of fields: name, logo, primary color, contact, tree price, plan).
- **Configuration/Deployment**: `next.config.js` (image domains, external packages, build-error suppression), `vercel.json` (per-route function limits), `.env*` (secrets), `setup.bat`/`setup.ps1` (local bootstrap), `DEPLOYMENT.md` (manual Vercel/Supabase/Razorpay/Resend runbook).

## 5. Notable Architectural Characteristic: Two Parallel Auth Systems

The platform runs **two independent authentication systems** side by side:
1. **NextAuth (Credentials + JWT)** for `User` (donors, admins, super admins) — session cookie, `middleware.ts` role gate.
2. **Custom mobile+OTP auth** for `Farmer` and separate email+password for `FieldOfficer` — neither integrated with NextAuth, no middleware protection (route-level checks only, if present). See [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) §5 and [CODE_REVIEW.md](CODE_REVIEW.md) for the implications.

## 6. Document Index

| Document | Contents |
|---|---|
| [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | Frontend & backend architecture, auth/authz, configuration, proposed BNZ Impact architecture |
| [DATABASE_DOCUMENTATION.md](DATABASE_DOCUMENTATION.md) | Full schema breakdown, ER diagram, indexes/constraints, data flows |
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md) | Every API endpoint: method, route, purpose, request/response, auth |
| [BUSINESS_MODULES.md](BUSINESS_MODULES.md) | How each business module works and interacts |
| [CODE_REVIEW.md](CODE_REVIEW.md) | Technical debt, duplication, security, performance, scalability findings |
| [BRANDING_ANALYSIS.md](BRANDING_ANALYSIS.md) | Every hardcoded JITO branding touchpoint |
| [SAAS_MIGRATION_PLAN.md](SAAS_MIGRATION_PLAN.md) | SaaS readiness assessment, proposed architecture, phased migration plan to BNZ Impact |
