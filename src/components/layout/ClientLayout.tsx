'use client';
// src/components/layout/ClientLayout.tsx
// Smart client wrapper that decides which layout to render
// SuperAdmin: SessionProvider only (no Navbar, no Footer, no OrgConfig)
// Tenant: SessionProvider + OrgConfigProvider + Navbar + Footer
//
// This replaces the old Providers.tsx which had Navbar/Footer inside it

import { SessionProvider } from 'next-auth/react';
import { OrgConfigProvider } from '@/components/OrgConfigProvider';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

interface Props {
  children: React.ReactNode;
  isSuperAdmin: boolean;
}

export default function ClientLayout({ children, isSuperAdmin }: Props) {
  // SuperAdmin — no tenant components at all
  if (isSuperAdmin) {
    return (
      <SessionProvider>
        {children}
      </SessionProvider>
    );
  }

  // Tenant — full layout
  return (
    <SessionProvider>
      <OrgConfigProvider>
        <Navbar />
        {children}
        <Footer />
      </OrgConfigProvider>
    </SessionProvider>
  );
}
