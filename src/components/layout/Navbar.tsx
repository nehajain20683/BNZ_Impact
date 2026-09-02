'use client';
// src/components/layout/Navbar.tsx — TENANT navbar only
// This component is NEVER rendered in /sadmin/* routes (isolated layout)
import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Menu, X, ChevronDown, User, LayoutDashboard, Settings, LogOut, Shield } from 'lucide-react';
import { useOrgConfig } from '@/components/OrgConfigProvider';
import { OrgLogo } from '@/components/OrgLogo';

export default function Navbar() {
  const { data: session } = useSession();
  const org   = useOrgConfig();
  const [open, setOpen] = useState(false);
  const [drop, setDrop] = useState(false);
  const user  = session?.user as any;
  const isAdmin       = ['ADMIN','SUPER_ADMIN'].includes(user?.role);
  const isSuperAdmin  = user?.role === 'SUPER_ADMIN';

  const links = [
    // "About Us" content is written specifically for the BNZ Green tenant —
    // hidden for every other tenant (page itself also blocks direct access).
    ...(org.slug === 'bnz-green' ? [{ href:'/about', label:'About Us' }] : []),
    { href:'/campaigns',label:'Sponsor Trees' },
    { href:'/impact',    label:'Impact Dashboard' },
    { href:'/csr',      label:'Corporate Support' },
    { href:'/contact',  label:'Contact' },
  ];

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          {org.logoUrl ? (
            <OrgLogo src={org.logoUrl} alt={org.name} size="md"/>
          ) : (
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: org.primaryColor || '#2d5a1b' }}>
              {(org.name || 'G').charAt(0)}
            </div>
          )}
          <div className="hidden sm:block">
            <div className="font-display text-base font-bold text-gray-900 leading-tight">{org.name || 'Green Legacy'}</div>
            <div className="text-gray-400 text-[10px]">Afforestation · Carbon Credits</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-6">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right */}
        <div className="hidden lg:flex items-center gap-3">
          <Link href="/farmer/register"
            className="flex items-center gap-1.5 text-white text-xs font-bold px-4 py-2 rounded-full"
            style={{ backgroundColor: org.primaryColor || '#2d5a1b' }}>
            🌱 Register Land
          </Link>
          {session?.user ? (
            <div className="relative">
              <button onClick={() => setDrop(d => !d)}
                className="flex items-center gap-2 text-sm text-gray-700 border border-gray-200 rounded-xl px-3 py-2">
                <User className="w-4 h-4"/>
                {user?.name || 'Account'}
                <ChevronDown className="w-3 h-3"/>
              </button>
              {drop && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="font-semibold text-gray-900 text-sm">{user?.name}</p>
                    <p className="text-gray-400 text-xs">{user?.email}</p>
                    {user?.role && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mt-1 inline-block font-bold">
                        {user.role.replace('_',' ')}
                      </span>
                    )}
                  </div>
                  <Link href={isAdmin ? '/admin' : '/dashboard'} onClick={() => setDrop(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <LayoutDashboard className="w-4 h-4"/> My Dashboard
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setDrop(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <Settings className="w-4 h-4"/> Admin Panel
                    </Link>
                  )}
                  {isSuperAdmin && (
                    <Link href="/sadmin" onClick={() => setDrop(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 border-t border-gray-100 mt-1 pt-2">
                      <Shield className="w-4 h-4"/> BNZ Control Panel
                    </Link>
                  )}
                  <button onClick={() => { setDrop(false); signOut({ callbackUrl:'/' }); }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left">
                    <LogOut className="w-4 h-4"/> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth/login" className="text-sm text-gray-600 border border-gray-200 rounded-xl px-3 py-2">
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile */}
        <button onClick={() => setOpen(o => !o)} className="lg:hidden p-2 text-gray-600">
          {open ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t bg-white px-4 py-4 space-y-3">
          {links.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="block text-gray-700 text-sm py-1">{l.label}</Link>
          ))}
          <Link href="/farmer/register" onClick={() => setOpen(false)}
            className="block text-center text-white text-sm font-bold py-2 rounded-xl"
            style={{ backgroundColor: org.primaryColor || '#2d5a1b' }}>
            🌱 Register Land
          </Link>
          {session?.user ? (
            <>
              <Link href={isAdmin ? '/admin' : '/dashboard'} onClick={() => setOpen(false)}
                className="block text-gray-700 text-sm py-1">My Dashboard</Link>
              {isSuperAdmin && (
                <Link href="/sadmin" onClick={() => setOpen(false)}
                  className="block text-purple-700 text-sm py-1 font-semibold">⚡ BNZ Control Panel</Link>
              )}
              <button onClick={() => signOut({ callbackUrl:'/' })} className="block text-red-600 text-sm py-1 w-full text-left">Sign Out</button>
            </>
          ) : (
            <Link href="/auth/login" onClick={() => setOpen(false)} className="block text-gray-700 text-sm py-1">Sign In</Link>
          )}
        </div>
      )}
    </nav>
  );
}
