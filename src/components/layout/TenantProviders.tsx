'use client';
// src/components/layout/TenantProviders.tsx
// Tenant-only providers — includes OrgConfigProvider for white-label theming
// This file is intentionally NOT imported anywhere in /sadmin routes
import { SessionProvider } from 'next-auth/react';
import { OrgConfigProvider } from '@/components/OrgConfigProvider';

export function TenantProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <OrgConfigProvider>
        {children}
      </OrgConfigProvider>
    </SessionProvider>
  );
}
