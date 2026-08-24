// scripts/create-super-admin.ts
//
// One-time (or as-needed) script to create/reset the single Super Admin
// account. Run locally, pointed at whichever database you want to seed —
// see instructions below.
//
// USAGE
//   1. Make sure DATABASE_URL in your environment (.env / .env.local, or
//      exported in your shell) points at the database you want to update —
//      double-check this if you have separate local/staging/production URLs.
//   2. Set a real password, either:
//        a) export SUPER_ADMIN_PASSWORD="something-strong-and-unique"
//      or b) edit the DEFAULT_PASSWORD constant below.
//      Do NOT ship/commit a real password in this file.
//   3. Run:
//        npx ts-node --transpile-only scripts/create-super-admin.ts
//
// This is idempotent — safe to re-run. If the account already exists it
// updates the password and makes sure the role is SUPER_ADMIN; otherwise
// it creates the account fresh.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Must match SUPER_ADMIN_EMAIL in src/lib/auth.ts exactly — auth.ts will
// silently downgrade any SUPER_ADMIN role on any other email.
const SUPER_ADMIN_EMAIL = 'sadmin@bnzgreen.io';
const DEFAULT_PASSWORD  = 'sadmin@123';

async function main() {
  const password = process.env.SUPER_ADMIN_PASSWORD || DEFAULT_PASSWORD;

  if (password === 'CHANGE_ME_BEFORE_RUNNING') {
    console.error(
      'Refusing to run with the placeholder password.\n' +
      'Set SUPER_ADMIN_PASSWORD in your environment, or edit DEFAULT_PASSWORD in this script.'
    );
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where:  { email: SUPER_ADMIN_EMAIL },
    update: {
      password: hash,
      role:     'SUPER_ADMIN',
      orgId:    null,      // Super Admin is not scoped to any single org
      isActive: true,
      isLocked: false,
      loginAttempts: 0,
      deletedAt: null,
    },
    create: {
      email:    SUPER_ADMIN_EMAIL,
      name:     'Super Admin',
      password: hash,
      role:     'SUPER_ADMIN',
      orgId:    null,
    },
  });

  console.log(`✅ Super Admin ready: ${user.email} (id: ${user.id})`);
  console.log('You can now log in at /sadmin/login (or /auth/login) with this email and the password you set.');
}

main()
  .catch((e) => {
    console.error('Failed to create/update Super Admin:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
