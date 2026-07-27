# Branding Analysis — JITO Green Legacy Platform

> Every location where JITO-specific branding is hardcoded rather than driven by the existing `Organization`/`OrgConfigProvider` mechanism. This is the primary input to the SaaS de-branding effort in [SAAS_MIGRATION_PLAN.md](SAAS_MIGRATION_PLAN.md). File:line references are as of the analysis date.

## 1. The Core Problem, in One Sentence

The codebase already contains a working white-label mechanism (`Organization` Prisma model → `/api/public/org-config` → `OrgConfigProvider` → `useOrgConfig()` → CSS var `--brand-primary` + `document.title`), but only `Navbar.tsx` and `Footer.tsx` consistently use it. Nearly everywhere else — hero copy, PDFs, emails, legal documents, meta tags, dropdown option lists, even bank account numbers — JITO branding is compiled directly into the source as string literals or constant objects, so a second tenant deployed from this codebase today would still show "JITO Green Legacy" almost everywhere except the navbar and footer.

## 2. The Single Biggest Offender: `src/lib/utils.ts`

```ts
export const BRAND = {
  name: 'JITO Green Legacy',
  tagline: 'A Family Tree Plantation Drive by Mumbai Zone',
  shortName: 'JGL',
  org: 'JITO Mumbai Zone',
  email: 'greenlegacy@jitomumbai.org',
  phone: '+91 98765 43210',
  address: 'Mumbai, Maharashtra, India',
};
```
Imported directly (bypassing `useOrgConfig()`) in `src/app/page.tsx`, `src/app/donate/page.tsx`, and `src/app/success/page.tsx` — meaning JITO's name/tagline/email/phone appear verbatim in: the homepage hero, the Razorpay checkout modal (`name`, `description` fields — visible in the *payment provider's own UI*, not just this site), and the post-donation WhatsApp/email share text.

The same file also hardcodes:
- `generateReceiptNumber()` → `JGL${year}${random}` — a JITO-specific prefix baked into a function with no org parameter, duplicating (and never reconciled with) `Organization.donation_ref_prefix` and `farmer-id.ts`'s org-aware prefix pattern.
- `CAMPAIGNS` — 4 campaign objects with Jain-community-specific names ("Ek Ped Dadi/Maa/Beti/Poti Ke Naam"), descriptions, image paths (`/campaigns/{dadi,maa,beti,poti}.png`), and per-campaign accent hex colors.
- `CAMPAIGN_PACKAGES` — Hindi-language tier badges ("विरासत निर्माता", "समर्पित", "संकल्पी", "प्रेरक") duplicated a second time (with the same values) in `src/lib/pdf.ts`'s `getTierBadge()`.
- `WHY_PLANT_IMAGES` — paths to JITO's own uploaded imagery.

## 3. Logos & Static Assets

| Asset | Location | Used by |
|---|---|---|
| JITO logo | `public/logos/jito-logo.png` | `pdf.ts` (`JITO_LOGO_B64`, embedded base64 in receipts & certificates) |
| Environment & Sustainability wing logo | `public/logos/env-logo.jpg`, `env-logo-1.png` | `pdf.ts` (`ENV_LOGO_B64`) |
| Mumbai Zone logo | `public/logos/mumbai-zone-logo.jpg/.png` | `pdf.ts` (`MZ_LOGO_B64`) |
| BNZ logo | `public/logos/bnz-logo.png` | `pdf.ts` (`BNZ_LOGO_B64` — imported but not observed in active use in the two PDF templates read) |
| Campaign hero art | `public/campaigns/{dadi,maa,beti,poti}.png` | `utils.ts` `CAMPAIGNS`, `/campaigns` and `/donate` pages |
| Sample site photos/polygons | `public/sites/{prakash,rakesh}-*.{jpg,png}` | `/impact` page hardcoded `PLANTATION_SITES` array |
| "Why plant" icons | `public/why/*.png` | `utils.ts` `WHY_PLANT_IMAGES` |

`src/lib/logo-data.ts` is an **auto-generated** file (per its own header comment) embedding these four logos as base64 data URIs specifically so `pdf.ts` can inline them into server-generated HTML→PDF without a network fetch. This file has zero org-awareness — it exports four fixed constants, not a lookup by org ID.

## 4. PDF Documents (Receipts, Certificates, Farmer Agreements)

`src/lib/pdf.ts` (donation receipts & certificates) and `src/lib/doc-templates.ts` (5 farmer legal document templates) are **entirely hardcoded** and take no `orgId`/branding parameter at all — a stark contrast with `email.ts`, which does look up org branding. Specific instances:

- Receipt watermark: literal text `"JITO GREEN LEGACY"` (`pdf.ts` — `generateReceiptPDF`)
- Receipt header: `"JITO Green Legacy"` name + `"A Family Tree Plantation Drive by Mumbai Zone and its Chapters"` tagline, both logos (`JITO_LOGO_B64`, `ENV_LOGO_B64`) side by side, `"Mumbai Zone"` logo in the footer
- Receipt tax note: `"JITO Mumbai Zone · 80G Reg: [Registration Number]"` — note the 80G number is itself an unfilled placeholder, not even wired to `Organization.org_80g_number`
- Certificate: `"JITO Green Legacy"` eyebrow + tagline, `"Presented by JITO Mumbai Zone and its Chapters"`, `"JITO Chapter: {chapter}"` line (defaults to `'Mumbai Zone'`), footer `"Authorised By: JITO Mumbai Zone"`, watermark `"CERTIFIED"`
- Both templates size/position four specific logo files by pixel dimensions (`logo-jito`, `logo-env`, `logo-mz` CSS classes) — the layout itself assumes exactly JITO's 3-logo header, not a single configurable tenant logo
- `doc-templates.ts` `logoHeader()`: `"JITO GREEN LEGACY"` + `"A Family Tree Plantation Drive by Mumbai Zone"` + `"Mumbai Zone · JES Wing"` + `mumbaizoneJES@jito.org`, repeated identically at the top of all 5 farmer documents
- Participation Agreement: `"JITO Mumbai Zone, an administrative zone of Jain International Trade Organisation (JITO)"` as the legal "Project Authority" party — a legal-entity name embedded directly in contract text
- Joint Owner NOC (Hindi): `"JITO मुंबई ज़ोन"`, footer note `"JITO Green Legacy कार्यालय"`
- Payment Receipt / Sapling Receipt / Plantation Certificate: document numbers hardcoded as `JGL/OPS/007`, `JGL/OPS/001`, `JGL/OPS/002`; "AUTHORISED BY / JITO Mumbai Zone" signature blocks; sapling receipt project-name default `'JITO Green Legacy'`; plantation certificate body text `"under the JITO Green Legacy Programme"`

## 5. Transactional Email

`src/lib/email.ts` is the **one lib file that is already org-aware** (calls `getOrgConfig(orgId)` and falls back to `JITO_DEFAULTS`/env vars only if no org is supplied) — a template worth reusing for `pdf.ts`/`doc-templates.ts`. Residual hardcoding: the footer line `"{orgName} · Powered by BNZ Green Technologies"` is intentional platform-provider attribution (arguably should stay, but should be configurable per plan tier), and the emoji/copy tone ("🌳 Tree Sponsorship Confirmed") is tree-plantation-specific rather than generic to "impact" categories a future BNZ Impact tenant (e.g. a scholarship fund) might need.

## 6. Frontend Pages — Hardcoded Text, Colors, Data

| Location | Hardcoded content |
|---|---|
| `src/app/layout.tsx` (root metadata) | `title: 'JITO Green Legacy'`, `description: 'A Family Tree Plantation Drive by Mumbai Zone'` — server-rendered `<title>`/meta tags for **every route**, including `/sadmin/*`; `OrgConfigProvider` only overwrites `document.title` client-side after mount, so SSR output, crawlers, and social-share previews always show JITO regardless of tenant |
| `src/app/page.tsx` (home) | `"8,500+ JITO Families"` stat; testimonial copy naming "JITO Mumbai Zone"/"JITO member"; image alt text `"...JITO Green Legacy"`; badge `"JITO Mumbai Zone · Family Plantation Drive"`; section heading `"Why JITO Mumbai Zone Wants to Plant"`; `"What JITO Families Say"`; `"Join thousands of JITO families"`; hardcoded mailto `greenlegacy@jitomumbai.org` |
| `src/app/about/page.tsx` | 100% single-tenant: named real office bearers, 11 named "JITO {Chapter}" entries with real people, JITO history/timeline — not reusable content, effectively requires per-tenant authoring or removal |
| `src/app/donate/page.tsx` | `"Please select your JITO Chapter"` + a hardcoded `<select>` of 17 real JITO sub-chapters (Ghatkopar, Goregaon, Gowalia Tank, Juhu, Kalyan-Dombivali, Midtown, Mulund, Navi Mumbai, Queen's Necklace, Thane, Walkeshwar, Ladies Wing, Youth Wing, etc.); Razorpay modal `name`/`description` from `BRAND`; hardcoded checkout theme color `#448039` (not the org's configured `primaryColor`) |
| `src/app/campaigns/page.tsx` | `"JITO Green Legacy"` eyebrow label |
| `src/app/impact/page.tsx` | A hardcoded `PLANTATION_SITES` array with **real farmer names** (Prakash Gighe, Rakesh Mourya), **real GPS coordinates**, and specific image files — duplicating data that the real `PlantationSite` Prisma model (used elsewhere in `/admin/plantation-sites`) already stores; `"JITO Mumbai Zone is actively scouting..."` copy |
| `src/app/contact/page.tsx` | `"the JITO Green Legacy programme"`; hardcoded `mumbaizoneJES@jito.org` and `+91 91377 41905` (this page also renders without the shared Navbar/Footer — Navbar/Footer imports are commented out, a separate bug) |
| `src/app/privacy-policy/page.tsx`, `refund-policy/page.tsx`, `terms/page.tsx` | All three legal pages hardcode `"JITO Green Legacy"` (multiple times each), `mumbaizoneJES@jito.org`, `+91 91377 41905`; `terms/page.tsx` additionally hardcodes "Palghar district, Maharashtra" and a Mumbai-courts jurisdiction clause — legal text that is specific to one organization's registration and would be actively wrong if shown to another tenant |
| `src/app/success/page.tsx` | Uses `BRAND.name`/`BRAND.tagline`; WhatsApp/email share text hardcodes `"JITO Green Legacy initiative"`, `"My JITO Green Legacy Tree Certificate"`; footer `"JITO Green Legacy · Mumbai Zone"` |
| `src/app/auth/login/page.tsx` | `"JITO Green Legacy"` beside logo; **a plaintext example credential rendered in the UI**: `"Admin: admin@jitomumbai.org / admin@123"` — beyond branding, this is a security issue (see [CODE_REVIEW.md](CODE_REVIEW.md)) |
| `src/app/auth/register/page.tsx`, `auth/forgot-password/page.tsx` | `"JITO Green Legacy"` heading |
| `src/app/admin/page.tsx` | Header `"JITO Green Legacy — Admin"`, subtitle `"Mumbai Zone · Environment & Sustainability"` |
| `src/app/admin/donations/page.tsx` | Duplicated 17-chapter list (same as `/donate`); a `BANKS` array with **real bank account numbers**: *"Bank of Ghatkopar (A/C: 0054713345 — JITO Ghatkopar Chapter Foundation Youth Wing)"* and *"Bank of Goregaon (A/C: 7246812022 — JITO Mumbai Goregaon Chapter Foundation)"*, repeated twice in the file — the same two accounts are also the `payment_banks` default in `org-config.ts`'s `JITO_DEFAULTS` |
| `src/app/admin/plantation-sites/page.tsx` | Header subtitle `"JITO Green Legacy — Master Project"`; ironically, a form placeholder hint already reads `"e.g. BNZ Green Technologies"` for the Plantation Partner field |
| `src/app/farmer/*` (login, register, dashboard, documents, land) | `"JITO Green Legacy"` heading on every screen; bilingual English/Hindi field labels (`labels.ts`) reflecting JITO's Maharashtra farmer base — a genuinely reusable i18n pattern, but the specific language pairing (EN/HI) is not configurable per tenant; India-specific document types (Aadhaar, 7/12 Extract) and species lists (Neem, Mango, Bamboo, Peepal, Sagwan) are baked into the component rather than sourced from org config |
| `src/components/layout/Navbar.tsx` | **Mostly org-aware** via `useOrgConfig()` — residual hardcoding: fallback hex `#2d5a1b`, and a static subtitle `"Afforestation · Carbon Credits"` not sourced from org config |
| `src/components/layout/Footer.tsx` | **Mostly org-aware** — residual hardcoding: `"Afforestation · Carbon Credits · dMRV"` tagline, a generic description paragraph, and a `"Powered by BNZ Green Technologies"` link to `bnzgreen.io` (intentional platform attribution, not currently tied to plan tier) |
| `src/components/admin/DMRVLayout.tsx` | Fixed dark theme (`bg-gray-950`) independent of `--brand-primary` — the DMRV module cannot currently be reskinned per tenant at all |
| `src/components/superadmin/SuperAdminLayout.tsx` | Intentionally BNZ-branded (`"BNZ Admin"`, `"BNZ Green Technologies · SaaS Control Panel"`) — this is correct/expected since it's the platform operator's own console, not tenant-facing |

## 7. Seed Data & Local Dev Defaults

`prisma/seed.ts` creates campaigns named "Dadi/Maa/Beti/Poti Campaign", an admin user `admin@jitomumbai.org` / password `admin@123`, a second legacy admin `admin@treeplantation.org`, three named plantation sites, and a field officer `officer@jitomumbai.org` / `officer@123` with a hardcoded name "Ramesh Patil". `src/components/OrgConfigProvider.tsx` and `src/lib/tenant.ts` both hardcode a `DEFAULT_CONFIG`/fallback object with JITO's name, email (`mumbaizoneJES@jito.org`), phone, and `id: 'org_jito_mumbai'` as a magic string constant referenced from multiple files — this ID is not read from an env var or config, so renaming/removing the default org would require a source change in at least two places (`tenant.ts`, `OrgConfigProvider.tsx`).

## 8. Colors

The intended theming mechanism is a single CSS custom property, `--brand-primary` (set by `OrgConfigProvider` from `Organization.primary_color`, default `#2d5a1b` — a sage/forest green). In practice, the specific hex `#2d5a1b` (or its near-duplicate `#448039` used in PDFs) appears as a **hardcoded fallback or literal** in at least: `tenant.ts`, `org-config.ts`, `OrgConfigProvider.tsx`, `Navbar.tsx`, `Footer.tsx`, `pdf.ts` (multiple shades throughout both templates), `doc-templates.ts`, `donate/page.tsx`'s Razorpay theme color, and the `/sadmin/orgs` create-tenant form's color-picker default. Because PDFs and farmer documents don't consume the CSS variable at all (they're server-rendered HTML strings with inline styles), **no amount of changing `Organization.primary_color` in the database will change the color of a receipt, certificate, or farmer agreement** for any tenant — this is a functional gap, not just cosmetic.

## 9. Summary Table — Branding Touchpoint vs. Org-Aware Today?

| Touchpoint | Org-aware today? |
|---|---|
| Navbar / Footer name, logo, primary color | ✅ Yes |
| Transactional email (donation confirmation, OTP) | ✅ Yes (via `email.ts` → `getOrgConfig`) |
| Farmer ID generation prefix | ✅ Yes (via `farmer-id.ts`) |
| Root `<title>`/meta description (SSR) | ❌ No — client-only override |
| Homepage, donate, success page copy (`BRAND` import) | ❌ No |
| Donation receipt / certificate PDFs | ❌ No — fully hardcoded, ignores `Organization` entirely |
| Farmer legal documents (agreement, NOC, receipts, certificate) | ❌ No — fully hardcoded |
| Legal pages (privacy/refund/terms) | ❌ No |
| About page | ❌ No (and largely non-generalizable content) |
| Impact/transparency page site data | ❌ No — hardcoded array instead of DB-backed |
| Donation chapter dropdown & offline bank accounts | ❌ No — JITO-specific, real financial data in source |
| Receipt-number format (`JGL{year}{random}`) | ❌ No — duplicates but bypasses `Organization.donation_ref_prefix` |
| DMRV module theme/branding | ❌ No — fixed dark theme, disconnected from `--brand-primary` |
