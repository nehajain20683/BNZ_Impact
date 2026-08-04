// src/app/layout.tsx
// BARE ROOT LAYOUT — only html/body shell
// Each section has its own layout:
//   /admin/*      → src/app/admin/layout.tsx       (AdminShell)
//   /sadmin/*     → src/app/(superadmin)/layout.tsx (BNZ dark sidebar)
//   everything else → ClientLayout (public Navbar + Footer)
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ClientLayout from '@/components/layout/ClientLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'JITO Green Legacy',
  description: 'A Family Tree Plantation Drive by Mumbai Zone',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
