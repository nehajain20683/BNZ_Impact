// scripts/reset-super-admin-password.js
// Run locally with your production DATABASE_URL set, e.g.:
//   DATABASE_URL="postgres://..." node scripts/reset-super-admin-password.js you@example.com "YourNewStrongPassword123!"
//
// Uses the same bcryptjs already in package.json — no new dependency.
// Does NOT touch anything else; only updates the password column for the
// one email you pass in, and only if that user's role is SUPER_ADMIN.

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const [,, email, newPassword] = process.argv;
  if (!email || !newPassword) {
    console.error('Usage: node scripts/reset-super-admin-password.js <email> <newPassword>');
    process.exit(1);
  }
  if (newPassword.length < 12) {
    console.error('Use at least 12 characters — a short password will just trip the same breach-checker again.');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) { console.error(`No user found with email ${email}`); process.exit(1); }
  if (user.role !== 'SUPER_ADMIN') {
    console.error(`User ${email} has role "${user.role}", not SUPER_ADMIN — refusing to change a non-super-admin password with this script.`);
    process.exit(1);
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { email }, data: { password: hashed } });
  console.log(`Password updated for ${email}. Log in with the new password now.`);
}

main().finally(() => prisma.$disconnect());
