'use client';
// src/components/layout/Navbar.tsx
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, LogOut, LayoutDashboard, User } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { BRAND } from '@/lib/utils';

const links = [
  { href: '/about',     label: 'About Us' },
  { href: '/campaigns', label: 'Sponsor Trees' },
  { href: '/impact',    label: 'Impact Dashboard' },
  { href: '/csr',       label: 'Corporate Support' },
  { href: '/contact',   label: 'Contact' },
];

export default function Navbar() {
  const [open, setOpen]           = useState(false);
  const [scrolled, setScrolled]   = useState(false);
  const [userMenu, setUserMenu]   = useState(false);
  const { data: session }         = useSession();
  const user                      = session?.user;
  const isAdmin                   = (user as any)?.role === 'ADMIN';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    if (!userMenu) return;
    const close = () => setUserMenu(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [userMenu]);

  function handleLogout() {
    signOut({ callbackUrl: '/' });
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/98 shadow-sm border-b border-sage-100' : 'bg-white/90'
    } backdrop-blur-md`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-sage-700 flex items-center justify-center shadow-sm">
            <svg viewBox="0 0 36 36" fill="none" className="w-6 h-6">
              <ellipse cx="18" cy="13" rx="9" ry="8" fill="#a7d99e"/>
              <ellipse cx="13" cy="16" rx="6" ry="5" fill="#7db870"/>
              <ellipse cx="23" cy="16" rx="6" ry="5" fill="#5a9e4e"/>
              <ellipse cx="18" cy="10" rx="7" ry="6.5" fill="#c8e8c3"/>
              <rect x="16.5" y="21" width="3" height="9" rx="1.5" fill="#92613a"/>
            </svg>
          </div>
          <div className="leading-none">
            <div className="font-display font-bold text-sage-900 text-[15px]">{BRAND.name}</div>
            <div className="text-[10px] text-sage-500 font-body tracking-wide hidden sm:block">{BRAND.tagline}</div>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-6">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className="text-sm text-sage-700 hover:text-sage-900 font-medium transition-colors relative group">
              {l.label}
              <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-sage-500 group-hover:w-full transition-all duration-200 rounded-full"/>
            </Link>
          ))}
        </div>

        {/* Right side CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <Link href="/farmer/register"
            className="flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-white text-xs font-bold px-3 py-2 rounded-full transition-colors whitespace-nowrap">
            🌱 Register Land
          </Link>
          {user ? (
            /* Logged-in user menu */
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setUserMenu(!userMenu)}
                className="flex items-center gap-2 bg-sage-50 border border-sage-200 text-sage-800 text-sm font-medium px-4 py-2 rounded-full hover:bg-sage-100 transition-colors"
              >
                <User className="w-4 h-4 text-sage-500"/>
                <span className="max-w-[120px] truncate">{user.name || user.email}</span>
                <span className="text-sage-400">▾</span>
              </button>

              {userMenu && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-sage-100 rounded-2xl shadow-xl py-2 z-50">
                  {/* User info */}
                  <div className="px-4 py-2 border-b border-sage-50">
                    <div className="text-xs font-semibold text-sage-900 truncate">{user.name}</div>
                    <div className="text-xs text-sage-400 truncate">{user.email}</div>
                    {isAdmin && (
                      <span className="inline-block mt-1 text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Admin
                      </span>
                    )}
                  </div>

                  {/* Menu items */}
                  <Link href="/dashboard"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-sage-700 hover:bg-sage-50 transition-colors"
                    onClick={() => setUserMenu(false)}>
                    <LayoutDashboard className="w-4 h-4 text-sage-400"/>
                    My Dashboard
                  </Link>

                  {isAdmin && (
                    <Link href="/admin"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-sage-700 hover:bg-sage-50 transition-colors"
                      onClick={() => setUserMenu(false)}>
                      <svg className="w-4 h-4 text-sage-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Admin Panel
                    </Link>
                  )}

                  <div className="border-t border-sage-50 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                      <LogOut className="w-4 h-4"/>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Guest buttons */
            <>
              <Link href="/auth/login"
                className="text-sm text-sage-600 hover:text-sage-800 font-medium transition-colors">
                Sign In
              </Link>
              <Link href="/campaigns"
                className="bg-sage-700 hover:bg-sage-800 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:shadow-md">
                Sponsor Trees
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="lg:hidden p-2 text-sage-700 rounded-lg hover:bg-sage-50"
          onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-white border-t border-sage-100 px-4 py-4 space-y-1 shadow-lg">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className="block text-sage-800 font-medium py-2.5 px-3 rounded-lg hover:bg-sage-50 transition-colors"
              onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="border-t border-sage-100 pt-3 mt-2 space-y-2">
            {user ? (
              <>
                <div className="px-3 py-2 text-sm text-sage-500">
                  Signed in as <strong className="text-sage-800">{user.name || user.email}</strong>
                </div>
                <Link href="/dashboard"
                  className="flex items-center gap-2 text-sage-700 py-2.5 px-3 rounded-lg hover:bg-sage-50"
                  onClick={() => setOpen(false)}>
                  <LayoutDashboard className="w-4 h-4"/> My Dashboard
                </Link>
                {isAdmin && (
                  <Link href="/admin"
                    className="flex items-center gap-2 text-sage-700 py-2.5 px-3 rounded-lg hover:bg-sage-50"
                    onClick={() => setOpen(false)}>
                    Admin Panel
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full text-red-600 py-2.5 px-3 rounded-lg hover:bg-red-50 text-sm font-medium">
                  <LogOut className="w-4 h-4"/> Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login"
                  className="block text-sage-700 py-2.5 px-3 rounded-lg hover:bg-sage-50 font-medium"
                  onClick={() => setOpen(false)}>
                  Sign In
                </Link>
                <Link href="/campaigns"
                  className="block bg-sage-700 text-white text-center py-3 rounded-xl font-semibold hover:bg-sage-800 transition-colors"
                  onClick={() => setOpen(false)}>
                  Sponsor Trees
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
