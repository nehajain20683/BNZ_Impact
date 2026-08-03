# JITO Green Legacy — Development Chat Transcript
# Date: July 2026
# Platform: Claude (Anthropic)

---

## PROJECT OVERVIEW

**App Name:** JITO Green Legacy  
**Type:** Multi-tenant SaaS Tree Plantation & Carbon Credit Platform  
**GitHub:** https://github.com/nehajain20683/jito-green-legacy (branch: main)  
**Live URL:** https://jito-green-legacy.vercel.app  
**Superadmin:** https://jito-green-legacy.vercel.app/sadmin  

---

## TECH STACK

- Next.js 14.2.18 + React 18 + TypeScript
- Tailwind CSS
- Prisma 5.22 + PostgreSQL (Supabase, Transaction Pooler port 6543)
- NextAuth v4 (JWT strategy)
- Razorpay (test mode payments)
- Resend (email)
- Vercel (deployment)

---

## CREDENTIALS

- **Admin login:** admin@jitomumbai.org / admin@123
- **Admin role in DB:** SUPER_ADMIN
- **Supabase:** JITO Tree PlanationDB project (NehaBNZ's Org)
- **Vercel project:** jito-green-legacy

### Environment Variables (Vercel)
```
DATABASE_URL=postgresql://postgres.xxxx:pass@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
NEXTAUTH_SECRET=treeplantationdrivesecretkey12345678
NEXTAUTH_URL=https://jito-green-legacy.vercel.app
NEXT_PUBLIC_APP_URL=https://jito-green-legacy.vercel.app
RAZORPAY_KEY_ID=rzp_test_SsqhgqIybcNZAm
RAZORPAY_KEY_SECRET=XmkXMEhg1HMjzWBGhANBjK6d
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_SsqhgqIybcNZAm
RESEND_API_KEY=re_6shUkX_NvZTbt8P28axjyJWAXUxQYNq
FROM_EMAIL=onboarding@resend.dev
FROM_NAME=JITO Green Legacy
```

---

## DATABASE — Supabase

### Key tables
- `organizations` — tenant registry (NEW — added this session)
- `users` — with `orgId` column
- `campaigns` — with `orgId` column
- `donations` — with `orgId` column
- `farmers` — with `orgId` column (land owners)
- `lands` — with `orgId` column
- `plantation_sites` — with `orgId` column
- `master_projects` — with `orgId` column
- `farmer_agreements`, `farmer_documents`, `land_assignments`
- `plantation_activities` — with `speciesPlanted` JSONB, `driveLink` TEXT
- `land_assignments` — with `speciesPlanted` JSONB, `driveLinks` TEXT[]
- `site_documents`, `timeline_events`, `monitoring_visits`

### JITO org ID
```
org_jito_mumbai
```

### SQL already run
```sql
-- Organizations table created and JITO seeded
-- orgId added to: users, campaigns, donations, farmers, lands, plantation_sites, master_projects
-- All existing data backfilled with org_jito_mumbai
-- Species tracking columns:
ALTER TABLE plantation_activities ADD COLUMN IF NOT EXISTS "speciesPlanted" JSONB;
ALTER TABLE plantation_activities ADD COLUMN IF NOT EXISTS "driveLink" TEXT;
ALTER TABLE land_assignments ADD COLUMN IF NOT EXISTS "speciesPlanted" JSONB;
ALTER TABLE land_assignments ADD COLUMN IF NOT EXISTS "driveLinks" TEXT[] DEFAULT '{}';
-- Land columns:
ALTER TABLE lands ADD COLUMN IF NOT EXISTS "waterAvailability" TEXT;
ALTER TABLE lands ADD COLUMN IF NOT EXISTS "securityStatus" TEXT;
```

---

## ARCHITECTURE — Multi-Tenant SaaS

### Tenant Resolution (src/lib/tenant.ts)
- Resolves org from: x-org-id header → custom domain → subdomain → default JITO
- 60s in-memory cache
- Returns OrgConfig with name, branding, pricing, bank details, farmer ID prefix

### Organization Config (src/lib/org-config.ts)
- JITO_DEFAULTS with all hardcoded values
- orgToBranding() converter

### Key lib files
- `src/lib/tenant.ts` — tenant resolution service
- `src/lib/org-config.ts` — branding defaults and converter
- `src/lib/farmer-id.ts` — org-aware farmer ID generation
- `src/lib/email.ts` — org-aware email sending
- `src/lib/pdf.ts` — certificate/receipt generation (still has some JITO hardcoding — Step 5b pending)
- `src/lib/doc-templates.ts` — document templates (Step 5b pending)

---

## PAGES & ROUTES

### Public Tenant
- `/` Homepage
- `/campaigns` — 4 JITO campaigns (Dadi/Maa/Beti/Poti + Individual)
- `/donate` — donation flow with Razorpay
- `/success` — post-payment success
- `/certificate?id=` — donation certificate
- `/receipt?id=` — payment receipt
- `/about`, `/contact`, `/csr`, `/impact`
- `/privacy-policy`, `/terms`, `/refund-policy`

### Auth
- `/auth/login`, `/auth/register`, `/auth/forgot-password`

### Farmer Portal
- `/farmer/register` — 8-step bilingual registration (NO OTP loop)
- `/farmer/login` — OTP-based login
- `/farmer/dashboard` — 5 tabs: Overview, Profile, My Land, Documents, Agreements
- `/farmer/land` — Add land parcel (dedicated page, no OTP)
- `/farmer/documents` — Document upload checklist (KML, Aadhaar, 7/12 etc.)

### Admin Panel (Tenant)
- `/admin` — Dashboard (client component, calls /api/admin/dashboard)
- `/admin/donations` — Full CRUD, manual entry, CSV import, WA tracking
- `/admin/farmers` — Land owner list
- `/admin/farmers/[id]` — 5 tabs: Profile, Lands, Documents, Agreements, Audit Log
- `/admin/plantation-sites` — Site list
- `/admin/plantation-sites/[id]` — 6 tabs: Dashboard, Farmers, Activities, Monitoring, Documents, Timeline
- `/admin/dmrv/dashboard` — dMRV module (dark theme)
- `/admin/dmrv/measure`, `/admin/dmrv/readiness` — Full pages
- `/admin/dmrv/{verify,carbon,evidence,audit,alerts,monitor,report}` — Stub pages

### SuperAdmin (BNZ isolated)
- `/sadmin/login` — Standalone BNZ login (NO tenant nav)
- `/sadmin` — BNZ Control Panel dashboard
- `/sadmin/orgs` — Tenant organisation management (Create/Edit/Toggle)
- `/sadmin/{users,plans,billing,analytics,settings}` — Stubs
- `/superadmin` — Redirects to `/sadmin`

### API Routes
- `/api/public/org-config` — Public tenant branding endpoint
- `/api/admin/dashboard` — Admin dashboard stats
- `/api/admin/donations` — CRUD + manual entry
- `/api/admin/donations/bulk` — CSV import
- `/api/admin/donations/send-email` — Email receipt/cert
- `/api/admin/agreements` — Generate/share farmer documents
- `/api/admin/plantation-sites/*` — Full CRUD + assignments + activities + monitoring + documents
- `/api/admin/farmers` — Farmer list
- `/api/farmer/profile` — GET/PATCH farmer profile (minimal includes)
- `/api/farmer/land` — GET/POST land parcels
- `/api/farmer/otp` — OTP send/verify
- `/api/farmer/agreements` — Farmer agreements
- `/api/farmer/agreements/[id]` — HTML view
- `/api/superadmin/orgs` — GET/POST orgs
- `/api/superadmin/orgs/[id]` — GET/PATCH/DELETE org
- `/api/payment/create-order`, `/api/payment/verify`, `/api/payment/webhook`

---

## KEY COMPONENTS

### Layout (src/components/layout/)
- `ClientLayout.tsx` — Smart wrapper: detects /sadmin via usePathname(), no Navbar for superadmin
- `Navbar.tsx` — Org-config driven, shows BNZ Control Panel link for SUPER_ADMIN
- `Footer.tsx` — Org-config driven contact details
- `Providers.tsx` — SessionProvider + OrgConfigProvider (no Navbar/Footer)
- `TenantProviders.tsx` — Same as Providers (alias)

### SuperAdmin (src/components/superadmin/)
- `SuperAdminLayout.tsx` — BNZ sidebar with dark theme
- `SuperAdminProviders.tsx` — SessionProvider only
- `withSuperAdmin.tsx` — HOC guarding all /sadmin pages

### Other
- `src/components/OrgConfigProvider.tsx` — Context + useOrgConfig() hook
- `src/components/admin/AdminSignOut.tsx` — Sign out button for admin

---

## ROUTE STRUCTURE (src/app/)

```
src/app/
├── layout.tsx                    ← Root layout (uses ClientLayout)
├── page.tsx                      ← Homepage
├── globals.css
├── (superadmin)/                 ← Route group (isolated)
│   ├── layout.tsx                ← SuperAdminProviders (SessionProvider only)
│   └── sadmin/
│       ├── login/page.tsx        ← BNZ standalone login
│       ├── page.tsx              ← BNZ dashboard
│       ├── orgs/page.tsx         ← Org management
│       └── {users,plans,billing,analytics,settings}/page.tsx
├── (tenant)/                     ← Route group (passthrough)
│   └── layout.tsx                ← Passthrough: return <>{children}</>
├── admin/                        ← Tenant admin
├── farmer/                       ← Farmer portal
├── auth/                         ← Auth pages
├── api/                          ← All API routes
└── superadmin/
    └── page.tsx                  ← Redirect to /sadmin
```

---

## MIDDLEWARE (src/middleware.ts)

```typescript
// Protects routes:
// /sadmin/* → SUPER_ADMIN only (redirect to /sadmin/login)
// /admin/*  → ADMIN or SUPER_ADMIN (redirect to /)
// /dashboard/* → any authenticated user
// /superadmin/* → redirect to /sadmin
// Sets x-pathname and x-is-superadmin headers
```

---

## MULTI-TENANT SAAS STATUS

| Step | What | Status |
|------|------|--------|
| 0 | SQL — organizations table + orgId backfill | ✅ Done |
| 1 | Schema — Organization model + relations | ✅ Done |
| 2 | tenant.ts — Tenant resolution service | ✅ Done |
| 3 | Superadmin panel at /sadmin | ✅ Done |
| 4 | OrgConfigProvider + /api/public/org-config | ✅ Done |
| 5a | farmer-id, email, Footer, Navbar, donations API | ✅ Done |
| 5b | pdf.ts, doc-templates.ts (hardcoded JITO strings) | ⏳ Pending |
| 6 | Standalone BNZ SuperAdmin at /sadmin | ✅ Done |

---

## CURRENT ISSUE (unresolved at end of session)

**Double Navbar on tenant app.** The last attempted fix:

`src/app/layout.tsx`:
```tsx
import ClientLayout from '@/components/layout/ClientLayout';
export default function RootLayout({ children }) {
  return (
    <html lang="en"><body>
      <ClientLayout>{children}</ClientLayout>
    </body></html>
  );
}
```

`src/components/layout/ClientLayout.tsx`:
```tsx
'use client';
import { usePathname } from 'next/navigation';
// Detects /sadmin → no Navbar; else → Navbar + Footer
```

**Files confirmed correct on GitHub (verified by screenshots):**
- `src/app/layout.tsx` ✅
- `src/components/layout/Providers.tsx` ✅ (no Navbar/Footer)
- `src/components/layout/ClientLayout.tsx` ✅
- `src/components/layout/TenantProviders.tsx` ✅
- `src/app/(tenant)/layout.tsx` ✅ (passthrough)

**Suspected remaining issue:** 
The `(superadmin)/layout.tsx` wraps with `SuperAdminProviders` which might be nesting on top of `ClientLayout`. But more likely there's another file on GitHub (possibly `src/app/admin/layout.tsx` or an old layout file) that still renders Navbar. Check all `layout.tsx` files under `src/app/`.

**Next debugging step:**
1. Go to GitHub → `src/app/` → check if `admin/layout.tsx` exists
2. Check `src/app/farmer/layout.tsx`  
3. Run: search GitHub for `<Navbar` across all files

---

## PLANTATION SITE MODULE

### Carbon Formula
`estimatedCarbon = trees × (survival%/100) × 0.022 tCO₂ × 25 years`
`estimatedCredits = carbon × 0.80`

### Farmer Land Lifecycle (13 stages)
ASSIGNED → SURVEY_COMPLETED → DOCS_VERIFIED → LAND_APPROVED → ASSIGNED_TO_SITE → PIT_DIGGING → SAPLINGS_DELIVERED → PLANTATION_COMPLETED → MONITORING → GAP_FILLING → CARBON_ELIGIBLE → VERIFIED → CREDITS_ISSUED

### Document Types Generated by Admin
- Landowner Participation Agreement
- NOC (Joint Owner)
- Farmer Payment Receipt
- Sapling Receipt cum Handover
- Plantation Completion Certificate

---

## dMRV MODULE

9 sub-modules: Measure, Monitor, Report, Verify, Carbon Estimation, Evidence Vault, Audit Trail, AI Alerts, dMRV Readiness

- Dashboard and Measure fully implemented
- Readiness page with circular progress gauges
- All others are structured stubs

---

## KNOWN ISSUES / PENDING

| Issue | Status |
|-------|--------|
| Double Navbar on tenant app | ⚠️ UNRESOLVED — see above |
| Step 5b: pdf.ts, doc-templates.ts hardcoded JITO | ⏳ Pending |
| MSG91 SMS for OTP | Not configured |
| Razorpay live keys | Test mode only |
| Resend custom domain | onboarding@resend.dev (goes to spam) |
| dMRV sub-modules full implementation | Stubs only |
| Separate Vercel project for admin.bnzgreen.io | Pending |
| Per-tenant Razorpay accounts | Deferred |
| Row-level security in Supabase | Deferred |

---

## HOW TO START NEXT CHAT

Paste this at the start of your next Claude conversation:

"I'm continuing development of JITO Green Legacy — a Next.js 14 multi-tenant SaaS tree plantation platform.

GitHub: nehajain20683/jito-green-legacy  
Live: jito-green-legacy.vercel.app  
Admin: admin@jitomumbai.org / admin@123 (role: SUPER_ADMIN)  
Stack: Next.js 14, Prisma, Supabase, NextAuth v4, Razorpay, Resend, Vercel

CURRENT PROBLEM: Double Navbar showing on the tenant app (jito-green-legacy.vercel.app). 

All these files have been confirmed correct on GitHub (no Navbar/Footer in them):
- src/app/layout.tsx — uses ClientLayout, no Navbar
- src/components/layout/Providers.tsx — SessionProvider + OrgConfigProvider only  
- src/components/layout/ClientLayout.tsx — usePathname() to detect /sadmin, adds Navbar for tenant routes only
- src/app/(tenant)/layout.tsx — passthrough only

The double navbar suggests another layout.tsx file somewhere in src/app/ (possibly src/app/admin/layout.tsx or src/app/farmer/layout.tsx) still has Navbar in it. Please help find and fix it."
