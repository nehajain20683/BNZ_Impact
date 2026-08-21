# BNZ Green Technologies — Multi-Tenant Deployment Guide

## Architecture

Same GitHub repo → Multiple Vercel projects → Same Supabase database

```
GitHub: nehajain20683/jito-green-legacy
    │
    ├── Vercel: jito-green-legacy      → TENANT_SLUG=jito-mumbai
    ├── Vercel: bnz-rotary             → TENANT_SLUG=rotary-mumbai-north  
    ├── Vercel: bnz-green-org          → TENANT_SLUG=bnz-green
    └── Vercel: bnz-admin              → TENANT_SLUG=superadmin
              ↓ all use ↓
         Same Supabase DB
         (orgId isolates data)
```

---

## Creating a New Tenant Deployment on Vercel

### Step 1 — Create new Vercel project
1. Go to vercel.com → New Project
2. Import: `nehajain20683/jito-green-legacy`
3. Project name: e.g. `bnz-rotary`

### Step 2 — Set Environment Variables
Add ALL of these in Vercel → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Same Supabase connection string |
| `NEXTAUTH_SECRET` | Same secret as other projects |
| `NEXTAUTH_URL` | **Unique** — this project's domain |
| `NEXT_PUBLIC_APP_URL` | Same as NEXTAUTH_URL |
| `TENANT_SLUG` | **Unique** — org slug from DB |
| `RAZORPAY_KEY_ID` | Your Razorpay key |
| `RAZORPAY_KEY_SECRET` | Your Razorpay secret |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same as RAZORPAY_KEY_ID |
| `RESEND_API_KEY` | Your Resend key |
| `FROM_EMAIL` | Sender email |
| `FROM_NAME` | Org name for emails |

### Step 3 — Deploy
Click Deploy. The build will:
- Read `TENANT_SLUG` at runtime
- Resolve all data to that org only
- Apply that org's branding

### Step 4 — Add Custom Domain
1. Vercel → Project → Settings → Domains
2. Add domain (e.g. `rotary.bnzgreen.io`)
3. Copy DNS records shown
4. Add DNS records at your registrar
5. Wait for SSL (usually 5-10 min)

### Step 5 — Update organizations table
```sql
UPDATE organizations 
SET custom_domain = 'rotary.bnzgreen.io'
WHERE slug = 'rotary-mumbai-north';
```

---

## Tenant Slugs Reference

| Tenant | TENANT_SLUG | NEXTAUTH_URL |
|--------|-------------|--------------|
| JITO Mumbai Zone | `jito-mumbai` | `https://jito-green-legacy.vercel.app` |
| Rotary Mumbai North | `rotary-mumbai-north` | `https://rotary.bnzgreen.io` |
| BNZ Green | `bnz-green` | `https://bnz.bnzgreen.io` |
| BNZ Admin | `superadmin` | `https://admin.bnzgreen.io` |

---

## Adding a New Tenant (complete checklist)

### Database
- [ ] Run: `INSERT INTO organizations (...)` with new org details
- [ ] Run: `INSERT INTO campaigns (...)` with org's campaigns
- [ ] Run: `INSERT INTO users (...)` for org admin user
- [ ] Verify: `SELECT * FROM organizations WHERE slug = 'new-slug'`

### Vercel
- [ ] Create new Vercel project from same GitHub repo
- [ ] Set all environment variables
- [ ] Set `TENANT_SLUG=new-slug`
- [ ] Set `NEXTAUTH_URL=https://their-domain.com`
- [ ] Deploy
- [ ] Add custom domain
- [ ] Verify SSL

### DNS
- [ ] Add A/CNAME records at domain registrar
- [ ] Wait for propagation (up to 48hrs, usually <1hr)

### Post-deploy
- [ ] Visit their domain → verify org branding shows
- [ ] Test login with their admin account
- [ ] Test donation flow
- [ ] Test farmer registration
- [ ] Verify `/api/public/org-config` returns their org

---

## Local Development

For localhost, set `TENANT_SLUG` in `.env.local`:

```env
# Test as JITO (default if blank)
TENANT_SLUG=

# Test as Rotary
TENANT_SLUG=rotary-mumbai-north

# Test as BNZ Green
TENANT_SLUG=bnz-green
```

No domain setup needed locally — TENANT_SLUG overrides everything.
