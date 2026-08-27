// src/middleware.ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// DEPLOYMENT_TARGET: unset (default) = current single-deployment behavior, unchanged.
// Set to 'superadmin' on the admin.bnzgreen.io Vercel project, or 'tenant' on a
// per-org project (jito-app / rotary-app), once those are split out. This is a
// second, independent layer of defense on top of DNS — even if a tenant bundle
// is ever reachable on the wrong host, this blocks the other deployment's routes.
const DEPLOYMENT_TARGET = process.env.DEPLOYMENT_TARGET; // 'superadmin' | 'tenant' | undefined

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth?.token?.role as string | undefined;

    // Clone request headers and add routing hint for layout
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-pathname', pathname);
    requestHeaders.set('x-is-superadmin', pathname.startsWith('/sadmin') ? '1' : '0');

    // Deployment-boundary enforcement (no-op unless DEPLOYMENT_TARGET is set)
    if (DEPLOYMENT_TARGET === 'superadmin' && pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/sadmin/login', req.url));
    }
    if (DEPLOYMENT_TARGET === 'tenant' && pathname.startsWith('/sadmin')) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Legacy redirect
    if (pathname === '/superadmin' || pathname.startsWith('/superadmin/')) {
      return NextResponse.redirect(
        new URL(pathname.replace('/superadmin', '/sadmin'), req.url)
      );
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

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        if (pathname === '/sadmin/login') return true;
        if (pathname.startsWith('/sadmin'))    return !!token;
        if (pathname.startsWith('/admin'))     return !!token;
        if (pathname.startsWith('/dashboard')) return !!token;
        // Farmer auth is an intentionally separate, custom system (not
        // NextAuth) — a real farmer never has a NextAuth token, so gating
        // these on !!token would lock every farmer out. Each farmer page
        // already does its own localStorage-based auth check client-side.
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
