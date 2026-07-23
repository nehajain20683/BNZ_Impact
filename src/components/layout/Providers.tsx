'use client';
// src/components/layout/Providers.tsx
// Tenant-side providers: SessionProvider + OrgConfigProvider
// Navbar and Footer are rendered by src/app/layout.tsx (not here)
import { SessionProvider } from 'next-auth/react';
import { OrgConfigProvider } from '@/components/OrgConfigProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <OrgConfigProvider>
        {children}
      </OrgConfigProvider>
    </SessionProvider>
  );
}
