// src/middleware.ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth?.token?.role as string | undefined;

    // Admin routes — allow ADMIN and SUPER_ADMIN
    if (pathname.startsWith('/admin')) {
      if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    // Superadmin routes — allow SUPER_ADMIN only
    if (pathname.startsWith('/superadmin')) {
      if (role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        if (pathname.startsWith('/dashboard'))  return !!token;
        if (pathname.startsWith('/admin'))      return !!token;
        if (pathname.startsWith('/superadmin')) return !!token;
        return true;
      },
    },
  }
);

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/superadmin/:path*'],
};
