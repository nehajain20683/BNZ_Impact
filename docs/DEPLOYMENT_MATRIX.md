# Deployment Matrix — 3 Vercel Projects, 1 Repo

Status: DRAFT. No Vercel projects created or DNS changed yet — planning artifact only.

## Projects

| Project | Domain (proposed) | `DEPLOYMENT_TARGET` | Database |
|---|---|---|---|
| `bnz-superadmin` | `admin.bnzgreen.io` | `superadmin` | Same Supabase as JITO (superadmin needs cross-org visibility for org management/billing) — confirm this is acceptable, or scope superadmin's DB access to org metadata only |
| `jito-app` | `jito-green-legacy.vercel.app` / JITO custom domain | `tenant` | Existing JITO Supabase project (unchanged) |
| `rotary-app` (future) | Rotary custom domain / subdomain | `tenant` | **New** Supabase project — separate `DATABASE_URL` |

## Env vars that MUST differ per project

| Var | superadmin | jito-app | rotary-app |
|---|---|---|---|
| `DEPLOYMENT_TARGET` | `superadmin` | `tenant` | `tenant` |
| `DATABASE_URL` | JITO DB (see note above) | JITO Supabase | Rotary's own Supabase |
| `NEXTAUTH_URL` | `https://admin.bnzgreen.io` | JITO domain | Rotary domain |
| `NEXTAUTH_SECRET` | unique per project | unique per project | unique per project — do NOT reuse JITO's |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | n/a (superadmin doesn't take payments) | JITO's Razorpay account | Rotary's own Razorpay account |
| `RESEND_API_KEY` / `FROM_EMAIL` / `FROM_NAME` | n/a or BNZ's own | JITO's Resend | Rotary's own Resend (or BNZ-managed, TBD) |
| `NEXT_PUBLIC_APP_URL` | admin domain | JITO domain | Rotary domain |

## Env vars that stay the SAME across all three (if not doing separate Rotary DB, only 2 differ)

`RAZORPAY_KEY_ID` note: if Rotary temporarily shares JITO's Razorpay account before getting their own, flag every Razorpay transaction with `orgId` in the order notes field so settlement/reconciliation can still be split later — do not silently commingle without a tagging plan.

## Build settings

All three projects: same repo, same `main` branch, same `buildCommand`/`installCommand` from `vercel.json`. Only the Vercel *project-level* env vars and assigned domain differ — no need for separate `vercel.json` files per project.

## Cutover checklist (for the actual go-live — not part of this draft)

- [ ] Create `bnz-superadmin` Vercel project, set env vars, deploy, verify in isolation on a temporary Vercel-assigned domain before attaching `admin.bnzgreen.io`
- [ ] Attach `DEPLOYMENT_TARGET=tenant` to existing JITO project (currently unset — safe, no-op until set)
- [ ] Verify `/sadmin/*` returns redirect on JITO project after the above
- [ ] Verify `/admin/*` returns redirect on superadmin project
- [ ] DNS cutover for `admin.bnzgreen.io` — requires approval
- [ ] (Future) Provision Rotary Supabase project, run full migration history against it, create `rotary-app` Vercel project — requires approval before real Rotary data enters it
