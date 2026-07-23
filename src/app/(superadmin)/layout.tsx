// src/app/(superadmin)/layout.tsx
// ISOLATED LAYOUT — Zero tenant components, zero JITO branding
// This layout serves /sadmin/* routes only
// Tenant layout (Navbar, Footer, OrgConfigProvider) never loads here

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import { SuperAdminProviders } from '@/components/superadmin/SuperAdminProviders';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BNZ Admin — Control Panel',
  description: 'BNZ Green Technologies — Multi-tenant SaaS Administration',
};

export default function SuperAdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Completely isolated — no Navbar, no Footer, no OrgConfigProvider
  // Only SuperAdminProviders (SessionProvider only)
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-white`}>
        <SuperAdminProviders>
          {children}
        </SuperAdminProviders>
      </body>
    </html>
  );
}
