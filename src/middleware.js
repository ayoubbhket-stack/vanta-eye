import { NextResponse } from 'next/server';

// Fast pre-check only: requests without a session cookie never reach admin
// pages or APIs. Every admin page and API still verifies the session and the
// user's role against the database on the server.
const PUBLIC_ADMIN = ['/admin/login', '/admin/setup', '/admin/reset', '/api/admin/auth/login', '/api/admin/auth/setup', '/api/admin/auth/reset'];

export function middleware(req) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_ADMIN.some((p) => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next();
  if (!req.cookies.get('ve_admin')?.value) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    const url = req.nextUrl.clone(); url.pathname = '/admin/login'; url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };
