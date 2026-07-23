'use client';
// Minimal providers for SuperAdmin — SessionProvider only
// OrgConfigProvider is intentionally excluded
import { SessionProvider } from 'next-auth/react';

export function SuperAdminProviders({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
