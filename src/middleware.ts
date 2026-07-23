// src/middleware.ts
// Routes:
//   /sadmin/*    → SUPER_ADMIN only, isolated from tenant layout
//   /admin/*     → ADMIN or SUPER_ADMIN
//   /dashboard/* → any authenticated user
//   /superadmin  → redirect to /sadmin (legacy URL)

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth?.token?.role as string | undefined;

    // Legacy /superadmin → redirect to new /sadmin
    if (pathname === '/superadmin' || pathname.startsWith('/superadmin/')) {
      return NextResponse.redirect(new URL(pathname.replace('/superadmin', '/sadmin'), req.url));
    }

    // /sadmin/* — SUPER_ADMIN only
    if (pathname.startsWith('/sadmin') && pathname !== '/sadmin/login') {
      if (!role || role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/sadmin/login', req.url));
      }
    }

    // /admin/* — ADMIN or SUPER_ADMIN
    if (pathname.startsWith('/admin')) {
      if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        if (pathname === '/sadmin/login') return true; // login page is public
        if (pathname.startsWith('/sadmin'))    return !!token;
        if (pathname.startsWith('/admin'))     return !!token;
        if (pathname.startsWith('/dashboard')) return !!token;
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    '/sadmin/:path*',
    '/superadmin/:path*',
    '/admin/:path*',
    '/dashboard/:path*',
  ],
};
