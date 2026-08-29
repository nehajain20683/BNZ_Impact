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
    if (DEPLOYMENT_TARGET === 'superadmin') {
      // This deployment exists only to serve the Super Admin panel — every
      // other route (donor site, tenant admin, farmer portal) redirects to
      // /sadmin instead, regardless of what was actually requested. /sadmin
      // itself still handles the SUPER_ADMIN-only check and bounces to
      // /sadmin/login when not authenticated, so this only needs to steer
      // traffic there, not duplicate that check.
      if (!pathname.startsWith('/sadmin') && pathname !== '/superadmin' && !pathname.startsWith('/superadmin/')) {
        return NextResponse.redirect(new URL('/sadmin', req.url));
      }
    }
    if (DEPLOYMENT_TARGET === 'tenant' && pathname.startsWith('/sadmin')) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // An Admin/Super Admin's day-to-day browsing should stay inside /admin —
    // not the donor-only /dashboard area, as if they were a regular donor.
    // An explicit link clicked *from inside* the admin panel (e.g. "view as
    // donor") is still allowed — detected via a same-origin referer coming
    // from /admin — so that intentional path is preserved.
    if (pathname.startsWith('/dashboard') && role && ['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      const referer = req.headers.get('referer') || '';
      const cameFromAdmin = referer.startsWith(`${req.nextUrl.origin}/admin`);
      if (!cameFromAdmin) {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
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
    // Passed explicitly rather than relying on next-auth/middleware's
    // automatic detection. Middleware runs in Vercel's Edge Runtime — a
    // genuinely separate execution environment from the Node.js functions
    // that create the session during login — and auto-detection of the
    // secret and of secure-cookie naming (__Secure- prefix) has a known
    // failure mode there: the session looks valid everywhere else, but
    // getToken() here treats it as absent, sending every request back to
    // the login page with a callbackUrl. Being explicit removes that gap.
    secret: process.env.NEXTAUTH_SECRET,
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
  // Broad, standard Next.js pattern: match every page route except API
  // routes, static files, and Next internals. This used to only cover
  // /sadmin, /admin and /dashboard — meaning the deployment-boundary check
  // above never even ran for /, /donate, /farmer/*, etc., so the
  // superadmin-only-deployment lockdown had no effect on most of the app.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)'],
};
