'use client';
// src/components/superadmin/SuperAdminLayout.tsx
// BNZ Green Technologies branding — completely independent from tenant UI
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard, Building2, Users, CreditCard,
  BarChart2, Settings, ChevronRight, LogOut,
  Shield, Bell, Menu, X, Zap, Globe,
  Package, Activity, ChevronDown
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { href: '/sadmin',           label: 'Dashboard',      icon: LayoutDashboard },
      { href: '/sadmin/analytics', label: 'Analytics',      icon: BarChart2 },
    ],
  },
  {
    label: 'Tenants',
    items: [
      { href: '/sadmin/orgs',   label: 'Organisations', icon: Building2 },
      { href: '/sadmin/users',  label: 'All Users',     icon: Users },
      { href: '/sadmin/plans',  label: 'Plans',         icon: Package },
    ],
  },
  {
    label: 'Revenue',
    items: [
      { href: '/sadmin/billing', label: 'Billing',      icon: CreditCard },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/sadmin/settings', label: 'Settings',    icon: Settings },
    ],
  },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const user = session?.user as any;

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside className={`
        ${collapsed ? 'w-16' : 'w-60'}
        flex-shrink-0 bg-gray-900 border-r border-gray-800
        flex flex-col transition-all duration-200 relative
      `}>
        {/* Logo */}
        <div className="px-4 py-5 border-b border-gray-800 flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-white"/>
              </div>
              <div>
                <div className="text-white font-bold text-sm leading-tight">BNZ Admin</div>
                <div className="text-gray-500 text-[10px]">Green Technologies</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto">
              <Zap className="w-4 h-4 text-white"/>
            </div>
          )}
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} className="text-gray-600 hover:text-gray-400 p-1">
              <Menu className="w-4 h-4"/>
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <button onClick={() => setCollapsed(false)}
            className="mx-auto mt-2 text-gray-600 hover:text-gray-400 p-1">
            <Menu className="w-4 h-4"/>
          </button>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto space-y-5">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              {!collapsed && (
                <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-2 mb-1">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const active = pathname === item.href ||
                    (item.href !== '/sadmin' && pathname.startsWith(item.href));
                  return (
                    <Link key={item.href} href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`
                        flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium
                        transition-all group relative
                        ${active
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                        }
                        ${collapsed ? 'justify-center' : ''}
                      `}>
                      <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-emerald-400' : 'text-gray-500 group-hover:text-gray-300'}`}/>
                      {!collapsed && <span>{item.label}</span>}
                      {!collapsed && active && <ChevronRight className="w-3 h-3 ml-auto text-emerald-500"/>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-gray-800 p-3">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[10px] font-bold">
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || 'S'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-200 text-xs font-medium truncate">{user?.name || 'Super Admin'}</p>
                <p className="text-gray-500 text-[10px] truncate">{user?.email}</p>
              </div>
              <button onClick={() => signOut({ callbackUrl: '/sadmin/login' })}
                title="Sign out"
                className="text-gray-600 hover:text-red-400 transition-colors p-1">
                <LogOut className="w-3.5 h-3.5"/>
              </button>
            </div>
          ) : (
            <button onClick={() => signOut({ callbackUrl: '/sadmin/login' })}
              title="Sign out"
              className="w-full flex justify-center text-gray-600 hover:text-red-400 p-1">
              <LogOut className="w-4 h-4"/>
            </button>
          )}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-xs">
              BNZ Green Technologies · SaaS Control Panel
            </span>
            <span className="text-gray-700">·</span>
            <span className="text-gray-600 text-xs font-mono">v2.0</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Environment badge */}
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
              {process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT'}
            </span>
            {/* Notifications */}
            <button onClick={() => setNotifOpen(n => !n)}
              className="relative text-gray-400 hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-800">
              <Bell className="w-4 h-4"/>
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full"/>
            </button>
            {/* Tenant site link */}
            <a href="https://jito-green-legacy.vercel.app" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-600 px-3 py-1.5 rounded-lg transition-colors">
              <Globe className="w-3.5 h-3.5"/>
              View Tenant Site
            </a>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-gray-950">
          {children}
        </main>
      </div>
    </div>
  );
}
