'use client';
import { usePathname } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { OrgConfigProvider } from '@/components/OrgConfigProvider';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSuperAdmin = pathname?.startsWith('/sadmin') || pathname?.startsWith('/superadmin');

  if (isSuperAdmin) {
    return (
      <SessionProvider>
        <div className="bg-gray-950 text-white min-h-screen">
          {children}
        </div>
      </SessionProvider>
    );
  }

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
