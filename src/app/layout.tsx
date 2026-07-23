// src/app/layout.tsx
// Uses x-is-superadmin header (set by middleware) to decide which layout to apply
// SuperAdmin: bare dark layout — zero tenant components
// Tenant: full Navbar + Footer + OrgConfigProvider
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { headers } from 'next/headers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'JITO Green Legacy',
  description: 'A Family Tree Plantation Drive by Mumbai Zone',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList    = headers();
  const isSuperAdmin   = headersList.get('x-is-superadmin') === '1';

  // ── SUPER ADMIN layout — completely isolated ──────────────────────────────
  if (isSuperAdmin) {
    return (
      <html lang="en" className="dark">
        <head>
          <title>BNZ Admin — Control Panel</title>
          <meta name="description" content="BNZ Green Technologies — SaaS Administration"/>
        </head>
        <body className={`${inter.className} bg-gray-950 text-white antialiased`}>
          {children}
        </body>
      </html>
    );
  }

  // ── TENANT layout — Navbar + Footer + OrgConfig ───────────────────────────
  // Dynamic imports keep the superadmin bundle clean
  const { TenantProviders } = await import('@/components/layout/TenantProviders');
  const Navbar              = (await import('@/components/layout/Navbar')).default;
  const Footer              = (await import('@/components/layout/Footer')).default;

  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <TenantProviders>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </TenantProviders>
      </body>
    </html>
  );
}
