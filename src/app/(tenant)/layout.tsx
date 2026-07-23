// src/app/(tenant)/layout.tsx
// Passthrough — Navbar/Footer/Providers handled by root ClientLayout
// This file must exist for the (tenant) route group but adds nothing
export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
