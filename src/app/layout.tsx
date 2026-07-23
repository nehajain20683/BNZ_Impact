// src/app/layout.tsx
// Single root layout for the entire app
// Uses x-is-superadmin header (set by middleware) to split tenant vs superadmin

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { headers } from 'next/headers';
import Providers from '@/components/layout/Providers';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'JITO Green Legacy',
  description: 'A Family Tree Plantation Drive by Mumbai Zone',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList  = headers();
  const isSuperAdmin = headersList.get('x-is-superadmin') === '1';

  // SuperAdmin routes: bare dark layout, zero tenant components
  if (isSuperAdmin) {
    return (
      <html lang="en" className="dark">
        <head><title>BNZ Admin — Control Panel</title></head>
        <body className={`${inter.className} bg-gray-950 text-white antialiased`}>
          {children}
        </body>
      </html>
    );
  }

  // Tenant routes: full layout with Navbar + Footer + Providers
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <Providers>
          <Navbar />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
