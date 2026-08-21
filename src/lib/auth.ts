// src/lib/auth.ts
// Tenant-aware authentication
// Users can ONLY login on their own org's domain
// SUPER_ADMIN can login on any domain
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages:   { signIn: '/auth/login' },

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

          if (!user || !user.password) return null;

          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) return null;

          // ── Tenant isolation check ─────────────────────────────
          // SUPER_ADMIN can login anywhere
          if (user.role === 'SUPER_ADMIN') {
            return {
              id:    user.id,
              email: user.email,
              name:  user.name,
              role:  user.role,
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
            role:  user.role,
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
