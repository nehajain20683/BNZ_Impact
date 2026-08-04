// src/middleware.ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth?.token?.role as string | undefined;

    // Clone request headers and add routing hint for layout
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-pathname', pathname);
    requestHeaders.set('x-is-superadmin', pathname.startsWith('/sadmin') ? '1' : '0');

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
        if (pathname.startsWith('/farmer/dashboard')) return !!token;
        if (pathname.startsWith('/farmer/documents')) return !!token;
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
    '/farmer/dashboard/:path*',
    '/farmer/documents/:path*',
  ],
};
