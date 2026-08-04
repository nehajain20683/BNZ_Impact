'use client';
// src/components/layout/FarmerProviders.tsx
// Minimal providers for farmer portal
// SessionProvider — for farmer auth (JWT token in localStorage)
// OrgConfigProvider — for tenant branding (logo, color, org name)
// NO Navbar, NO Footer — farmer pages have their own branded headers
import { SessionProvider } from 'next-auth/react';
import { OrgConfigProvider } from '@/components/OrgConfigProvider';

export function FarmerProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <OrgConfigProvider>
        {children}
      </OrgConfigProvider>
    </SessionProvider>
  );
}
