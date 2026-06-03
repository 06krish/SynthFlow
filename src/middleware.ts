import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Read session cookies (plain text!)
  const userRole = request.cookies.get('user_role')?.value;
  const userEmail = request.cookies.get('user_email')?.value;
  const isLoggedIn = !!userEmail;

  // Rule A: If not logged in and trying to access dashboards -> redirect to /login
  if (!isLoggedIn && (pathname.startsWith('/admin') || pathname.startsWith('/seller'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Rule B: If already logged in and going to /login -> redirect to dashboard
  if (isLoggedIn && pathname === '/login') {
    if (userRole === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    } else {
      return NextResponse.redirect(new URL('/seller', request.url));
    }
  }

  // Rule C: Prevent sellers from opening the Admin dashboard
  if (isLoggedIn && pathname.startsWith('/admin') && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/seller', request.url));
  }

  // Allow the request to proceed
  return NextResponse.next();
}

// Specify which folders/paths the middleware should monitor
export const config = {
  matcher: ['/admin/:path*', '/seller/:path*', '/login'],
};
