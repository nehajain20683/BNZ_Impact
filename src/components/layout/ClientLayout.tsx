'use client';
// src/components/layout/ClientLayout.tsx
// Applies to ALL routes via root layout
// BUT admin and superadmin have their own layouts that override this
// So for /admin/* → AdminLayout takes over (no Navbar/Footer from here)
// For /sadmin/* → SuperAdmin layout takes over
// For everything else → public Navbar + Footer + OrgConfigProvider

import { usePathname } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { OrgConfigProvider } from '@/components/OrgConfigProvider';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // These sections have their own dedicated layouts
  // They MUST NOT get public Navbar/Footer
  const isAdmin      = pathname?.startsWith('/admin');
  const isSuperAdmin = pathname?.startsWith('/sadmin') || pathname?.startsWith('/superadmin');

  // Admin and SuperAdmin: SessionProvider only — their own layout handles the rest
  if (isAdmin || isSuperAdmin) {
    return (
      <SessionProvider>
        {children}
      </SessionProvider>
    );
  }

  // Public website and farmer portal: full Navbar + Footer + OrgConfig
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
