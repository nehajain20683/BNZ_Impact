// src/app/(superadmin)/layout.tsx
// Adds SessionProvider for /sadmin/* routes
// The dark BNZ theme is applied by the root layout via x-is-superadmin header
import { SuperAdminProviders } from '@/components/superadmin/SuperAdminProviders';

export default function SuperAdminGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <SuperAdminProviders>
      {children}
    </SuperAdminProviders>
  );
}
