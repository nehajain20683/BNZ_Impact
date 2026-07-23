// src/app/(tenant)/layout.tsx
// TENANT layout — Navbar, Footer, OrgConfigProvider
// Applied to all tenant routes: /, /campaigns, /donate, /admin, /farmer, etc.
// NEVER applied to /sadmin/* (that has its own superadmin layout)
import { TenantProviders } from '@/components/layout/TenantProviders';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantProviders>
      <Navbar />
      {children}
      <Footer />
    </TenantProviders>
  );
}
