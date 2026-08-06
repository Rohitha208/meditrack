import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSubdomainFromHost } from './utils/appMode';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostHeader = request.headers.get('host');

  // Skip middleware for API routes and static files
  if (pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/static') ||
      pathname.includes('.')) {
    return NextResponse.next();
  }

  // Extract subdomain
  const subdomain = getSubdomainFromHost(hostHeader);

  // If we have a subdomain, add it to the request headers for use in components
  if (subdomain) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-subdomain', subdomain);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 