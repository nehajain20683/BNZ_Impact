'use client';
// src/components/admin/AdminNav.tsx
// Admin sidebar navigation - generic, tenant-customizable
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, DollarSign, Users, TreePine,
  BarChart2, FileText, Settings, Activity,
  Zap, ChevronRight, Shield, Megaphone, Leaf, Image as ImageIcon, PenTool
} from 'lucide-react';
import { useSession } from 'next-auth/react';

const NAV = [
  {
    label: 'Overview',
    items: [
      { href: '/admin',                   label: 'Dashboard',         icon: LayoutDashboard },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/campaigns',         label: 'Campaigns',         icon: Megaphone },
      { href: '/admin/donations',         label: 'Donations',         icon: DollarSign },
      { href: '/admin/farmers',           label: 'Land Owners',       icon: Users },
      { href: '/admin/plantation-sites',  label: 'Plantation Sites',  icon: TreePine },
      { href: '/admin/community-updates', label: 'Community Updates', icon: ImageIcon },
      { href: '/admin/documents',         label: 'Documents',         icon: FileText },
      { href: '/admin/species-images',    label: 'Species Images',    icon: Leaf },
      { href: '/admin/field-officers',    label: 'Field Officers',    icon: Users },
      { href: '/admin/signatories',       label: 'Signatories',       icon: PenTool },
      { href: '/admin/impact-metrics',    label: 'Impact Metrics',    icon: Leaf },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { href: '/admin/dmrv/dashboard',    label: 'Digital MRV',       icon: Zap },
      { href: '/admin/reports',           label: 'Reports',           icon: FileText },
    ],
  },
  {
    label: 'Management',
    items: [
      { href: '/admin/users',             label: 'Users',             icon: Users },
      { href: '/admin/logs',              label: 'Activity Logs',     icon: Activity },
      { href: '/admin/settings',          label: 'Settings',          icon: Settings },
    ],
  },
];

interface AdminNavProps {
  orgName:    string;
  orgColor:   string;
  logoUrl?:   string | null;
  collapsed:  boolean;
}

export default function AdminNav({ orgName, orgColor, logoUrl, collapsed }: AdminNavProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  return (
    <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
      {NAV.map(section => (
        <div key={section.label}>
          {!collapsed && (
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-2 mb-1">
              {section.label}
            </p>
          )}
          <div className="space-y-0.5">
            {section.items.map(item => {
              // Exact match for dashboard, prefix match for others
              const active = item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);

              return (
                <Link key={item.href} href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`
                    flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium
                    transition-all group
                    ${collapsed ? 'justify-center' : ''}
                    ${active
                      ? 'text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                  style={active ? { backgroundColor: orgColor } : {}}>
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`}/>
                  {!collapsed && <span>{item.label}</span>}
                  {!collapsed && active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-white/70"/>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {/* SuperAdmin link */}
      {role === 'SUPER_ADMIN' && (
        <div>
          {!collapsed && (
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-2 mb-1">
              Platform
            </p>
          )}
          <Link href="/sadmin"
            title={collapsed ? 'BNZ Control Panel' : undefined}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium
              text-purple-600 hover:bg-purple-50 transition-all
              ${collapsed ? 'justify-center' : ''}`}>
            <Shield className="w-4 h-4 text-purple-500"/>
            {!collapsed && <span>BNZ Control Panel</span>}
          </Link>
        </div>
      )}
    </nav>
  );
}
