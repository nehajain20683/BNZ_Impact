'use client';
// src/components/admin/AdminShell.tsx
// The complete admin application shell
// Sidebar + topbar — completely independent from public website
// Generic by default, customizable per tenant via org config

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Menu, X, Bell, LogOut, ChevronDown,
  User, ExternalLink, TreePine
} from 'lucide-react';
import AdminNav from './AdminNav';
import OrgSwitcher from './OrgSwitcher';

interface OrgConfig {
  name:          string;
  primaryColor:  string;
  logoUrl?:      string | null;
  email?:        string | null;
  plan?:         string;
}

const DEFAULT_ORG: OrgConfig = {
  name:         'Admin Panel',
  primaryColor: '#2d5a1b',
  logoUrl:      null,
};

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router  = useRouter();
  const [collapsed, setCollapsed]   = useState(false);
  const [userMenu, setUserMenu]     = useState(false);
  const [orgConfig, setOrgConfig]   = useState<OrgConfig>(DEFAULT_ORG);
  const [mobileOpen, setMobileOpen] = useState(false);

  const user      = session?.user as any;
  const role      = user?.role;
  const isAllowed = ['ADMIN', 'SUPER_ADMIN'].includes(role);

  // Load org config for this tenant
  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login'); return; }
    if (status === 'loading') return;
    if (!isAllowed) { router.push('/'); return; }

    fetch('/api/admin/org-config')
      .then(r => r.json())
      .then(d => {
        if (d.org) {
          setOrgConfig({
            name:         d.org.name,
            primaryColor: d.org.primary_color || '#2d5a1b',
            logoUrl:      d.org.logo_url || null,
            email:        d.org.email,
            plan:         d.org.plan,
          });
          // Inject org color as CSS variable for admin theming
          document.documentElement.style.setProperty('--admin-primary', d.org.primary_color || '#2d5a1b');
        }
      })
      .catch(() => {});
  }, [status, role]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <TreePine className="w-8 h-8 text-gray-300 mx-auto mb-3 animate-pulse"/>
          <p className="text-gray-400 text-sm">Loading admin panel…</p>
        </div>
      </div>
    );
  }

  if (!session || !isAllowed) return null;

  const sidebarWidth = collapsed ? 'w-16' : 'w-56';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside className={`
        ${sidebarWidth} flex-shrink-0 bg-white border-r border-gray-200
        flex flex-col transition-all duration-200 shadow-sm
        fixed lg:relative inset-y-0 left-0 z-40
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Logo / Org branding */}
        <div className="h-16 flex items-center px-4 border-b border-gray-100">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {orgConfig.logoUrl ? (
                <img src={orgConfig.logoUrl} alt={orgConfig.name}
                  className="w-8 h-8 rounded-lg object-contain flex-shrink-0"/>
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: orgConfig.primaryColor }}>
                  {orgConfig.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-gray-900 font-bold text-sm truncate leading-tight">
                  {orgConfig.name}
                </div>
                <div className="text-gray-400 text-[10px] leading-none mt-0.5">
                  {orgConfig.plan || 'Admin Panel'}
                </div>
              </div>
              <button onClick={() => setCollapsed(true)}
                className="text-gray-300 hover:text-gray-500 p-1 flex-shrink-0">
                <X className="w-3.5 h-3.5"/>
              </button>
            </div>
          ) : (
            <button onClick={() => setCollapsed(false)} className="mx-auto">
              {orgConfig.logoUrl ? (
                <img src={orgConfig.logoUrl} alt="" className="w-8 h-8 rounded-lg object-contain"/>
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: orgConfig.primaryColor }}>
                  {orgConfig.name.charAt(0)}
                </div>
              )}
            </button>
          )}
        </div>

        {/* Navigation */}
        <AdminNav
          orgName={orgConfig.name}
          orgColor={orgConfig.primaryColor}
          logoUrl={orgConfig.logoUrl}
          collapsed={collapsed}
        />

        {/* User profile at bottom */}
        <div className="border-t border-gray-100 p-3">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: orgConfig.primaryColor }}>
                {user?.name?.charAt(0) || user?.email?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 text-xs font-semibold truncate">{user?.name || 'Admin'}</p>
                <p className="text-gray-400 text-[10px] truncate">{user?.email}</p>
              </div>
              <button onClick={() => signOut({ callbackUrl: '/auth/login' })}
                title="Sign out"
                className="text-gray-300 hover:text-red-400 transition-colors p-1">
                <LogOut className="w-3.5 h-3.5"/>
              </button>
            </div>
          ) : (
            <button onClick={() => signOut({ callbackUrl: '/auth/login' })}
              className="w-full flex justify-center text-gray-300 hover:text-red-400 p-1">
              <LogOut className="w-4 h-4"/>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}/>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button onClick={() => setMobileOpen(m => !m)}
              className="lg:hidden text-gray-400 hover:text-gray-600 p-1">
              <Menu className="w-5 h-5"/>
            </button>
            {/* Page breadcrumb handled by each page */}
            <div className="hidden lg:block text-gray-300 text-sm">
              Admin Panel
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Org Switcher for SUPER_ADMIN */}
            {role === 'SUPER_ADMIN' && <OrgSwitcher/>}

            {/* View public site */}
            <a href="/" target="_blank" rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors">
              <ExternalLink className="w-3.5 h-3.5"/>
              View Site
            </a>

            {/* Notifications */}
            <button className="relative text-gray-400 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100">
              <Bell className="w-4 h-4"/>
            </button>

            {/* User menu */}
            <div className="relative">
              <button onClick={() => setUserMenu(m => !m)}
                className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-xl px-3 py-1.5 transition-colors">
                <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ backgroundColor: orgConfig.primaryColor }}>
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <span className="hidden lg:block font-medium text-xs max-w-24 truncate">{user?.name || 'Admin'}</span>
                <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${userMenu ? 'rotate-180' : ''}`}/>
              </button>

              {userMenu && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-2xl shadow-xl py-1.5 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="font-semibold text-gray-900 text-sm">{user?.name}</p>
                    <p className="text-gray-400 text-xs truncate">{user?.email}</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1 inline-block"
                      style={{ backgroundColor: orgConfig.primaryColor + '20', color: orgConfig.primaryColor }}>
                      {role?.replace('_', ' ')}
                    </span>
                  </div>
                  <Link href="/admin" onClick={() => setUserMenu(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                    <User className="w-3.5 h-3.5"/> My Account
                  </Link>
                  <button onClick={() => signOut({ callbackUrl: '/auth/login' })}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 w-full text-left border-t border-gray-100 mt-1">
                    <LogOut className="w-3.5 h-3.5"/> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
