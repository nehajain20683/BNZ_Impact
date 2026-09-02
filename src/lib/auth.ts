// src/lib/auth.ts
// Tenant-aware authentication
// Users can ONLY login on their own org's domain
// SUPER_ADMIN can login on any domain
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// There must be exactly one Super Admin identity. Even if a database row
// somehow ends up with role SUPER_ADMIN on another email (bad migration,
// manual DB edit, bug elsewhere), this is a hard backstop that prevents
// that account from ever being granted Super Admin access.
const SUPER_ADMIN_EMAIL = 'sadmin@bnzgreen.io';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages:   { signIn: '/auth/login' },
  // Prints the real reason a sign-in attempt failed (wrong password vs. no
  // user vs. thrown error) to your terminal — safe to leave on in dev,
  // should NOT be on in production (it can log sensitive request details).
  debug: process.env.NODE_ENV !== 'production',

  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            console.log(`[auth] No user found for email: "${credentials.email}"`);
            return null;
          }
          if (!user.password) {
            console.log(`[auth] User "${credentials.email}" has no password set (password column is null)`);
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            console.log(`[auth] Password mismatch for "${credentials.email}"`);
            return null;
          }

          // Login was successful from here on — record it. This was
          // previously only done for the separate farmer auth system;
          // regular Users (donor/admin/super admin) never had this field
          // written at all, so it always showed blank on the admin side.
          // Fire-and-forget: never let this delay or break a real login.
          prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});

          // Only sadmin@bnzgreen.io may ever hold SUPER_ADMIN. Downgrade any
          // other account that somehow carries that role in the database.
          // Compare case-insensitively — emails are stored/typed inconsistently
          // in practice and a mismatch here would incorrectly lock out the
          // real Super Admin account.
          const effectiveRole =
            user.role === 'SUPER_ADMIN' && user.email.trim().toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()
              ? 'ADMIN'
              : user.role;

          // ── Tenant isolation check ─────────────────────────────
          // SUPER_ADMIN can login anywhere
          if (effectiveRole === 'SUPER_ADMIN') {
            return {
              id:    user.id,
              email: user.email,
              name:  user.name,
              role:  effectiveRole,
              orgId: user.orgId,
            };
          }

          // For all other roles, verify the user belongs to this deployment's org
          const tenantSlug = process.env.TENANT_SLUG;

          if (tenantSlug && tenantSlug !== 'superadmin') {
            // Resolve the org for this deployment
            const deploymentOrg = await (prisma as any).organization.findUnique({
              where: { slug: tenantSlug },
            });

            if (deploymentOrg && user.orgId !== deploymentOrg.id) {
              // User doesn't belong to this org — reject login
              throw new Error(`WRONG_ORG:${deploymentOrg.name}`);
            }
          }

          return {
            id:    user.id,
            email: user.email,
            name:  user.name,
            role:  effectiveRole,
            orgId: user.orgId,
          };
        } catch (e: any) {
          // Pass through WRONG_ORG error so login page can show it
          if (e.message?.startsWith('WRONG_ORG:')) throw e;
          console.error('Auth error:', e);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role  = (user as any).role;
        token.id    = user.id;
        token.orgId = (user as any).orgId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).role  = token.role;
        (session.user as any).id    = token.id;
        (session.user as any).orgId = token.orgId;
      }
      return session;
    },
  },
};
