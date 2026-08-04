// src/app/farmer/layout.tsx
// ═══════════════════════════════════════════════════════════════
// FARMER PORTAL LAYOUT
// Applies to: /farmer/register, /farmer/login, /farmer/dashboard,
//             /farmer/documents, /farmer/land, etc.
//
// Completely independent from:
//   - Public website (no Navbar, no Footer from public site)
//   - Admin panel (/admin/*)
//   - SuperAdmin (/sadmin/*)
//
// Each farmer page has its own branded header using useOrgConfig()
// This layout just provides SessionProvider + OrgConfigProvider
// ═══════════════════════════════════════════════════════════════
import { FarmerProviders } from '@/components/layout/FarmerProviders';

export const metadata = {
  title: 'Land Owner Portal',
  description: 'Register and manage your land for plantation',
};

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  return (
    <FarmerProviders>
      {children}
    </FarmerProviders>
  );
}
