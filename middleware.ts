import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // request.nextUrl.hostname does not reflect the incoming Host header in
  // some dev setups, so read it directly from the request headers instead.
  const hostname = (request.headers.get('host') || '').split(':')[0];

  // Skip middleware for API routes and static files
  if (pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/static') ||
      pathname.includes('.')) {
    return NextResponse.next();
  }

  // Extract subdomain
  const subdomain = getSubdomain(hostname);

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

function getSubdomain(hostname: string): string | null {
  // Handle bare localhost / IP for development (no subdomain)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }

  // Handle product subdomains on localhost, e.g. meditrack.localhost, pawtrack.localhost
  if (hostname.endsWith('.localhost')) {
    const parts = hostname.split('.');
    return parts[0];
  }

  // Handle your specific domain structure: subdomain.xcdify.com
  if (hostname.endsWith('.xcdify.com')) {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts[0]; // Extract subdomain from subdomain.xcdify.com
    }
  }

  // Extract subdomain from other hostnames (fallback)
  const parts = hostname.split('.');

  // If we have more than 2 parts, the first part is the subdomain
  if (parts.length > 2) {
    return parts[0];
  }

  // If no subdomain, return null (main domain)
  return null;
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