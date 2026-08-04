// src/app/admin/layout.tsx
// ═══════════════════════════════════════════════════════════════
// ADMIN APPLICATION LAYOUT
// Applies to: /admin, /admin/donations, /admin/farmers, 
//             /admin/plantation-sites, /admin/dmrv/*, etc.
// 
// Completely independent from:
//   - Public website (no Navbar, no Footer)
//   - SuperAdmin BNZ panel (separate at /sadmin)
//   - OrgConfigProvider (admin uses /api/admin/org-config instead)
//
// Generic + tenant-customizable:
//   - Org name, logo, color from org config API
//   - SUPER_ADMIN can switch between tenants via OrgSwitcher
//   - Each tenant sees their own data automatically
// ═══════════════════════════════════════════════════════════════
import AdminShell from '@/components/admin/AdminShell';

export const metadata = {
  title: 'Admin Panel',
  description: 'Plantation Management Admin Panel',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell>
      {children}
    </AdminShell>
  );
}
