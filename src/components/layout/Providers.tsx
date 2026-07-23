'use client';
// src/components/layout/Providers.tsx
// DEPRECATED — kept for backward compatibility only
// Navbar and Footer are now managed by ClientLayout
// This is a simple passthrough wrapper
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
