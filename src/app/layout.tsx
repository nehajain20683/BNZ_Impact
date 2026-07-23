import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { headers } from 'next/headers';
import ClientLayout from '@/components/layout/ClientLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'JITO Green Legacy',
  description: 'A Family Tree Plantation Drive by Mumbai Zone',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const isSuperAdmin = headers().get('x-is-superadmin') === '1';
  return (
    <html lang="en" className={isSuperAdmin ? 'dark' : ''}>
      <body className={`${inter.className} antialiased ${isSuperAdmin ? 'bg-gray-950 text-white' : ''}`}>
        <ClientLayout isSuperAdmin={isSuperAdmin}>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}