// src/app/admin/layout.tsx - Server component (no 'use client')
// Metadata is fine here as this is a server component
// AdminShell is imported as a client component boundary
import type { Metadata } from 'next';
import AdminShell from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: 'Admin Panel',
  description: 'Plantation Management Admin Panel',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
