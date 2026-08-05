import { getRedirectUrl } from '@/services/auth/redirectService';
import { NextResponse } from 'next/server';
import { getProductTypeFromSubdomain, getSubdomainFromHost } from '@/utils/appMode';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const subdomain = getSubdomainFromHost(request.headers.get('host'));
    const appMode = getProductTypeFromSubdomain(subdomain);

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login?appMode=${appMode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // If we have a specific error message from the backend, use it
      if (errorData.message) {
        return NextResponse.json({ error: errorData.message }, { status: response.status });
      }

      // Fallback error
      return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: response.status });
    }

    const data = await response.json();

    const redirectUrl = getRedirectUrl(data.user);

    const token = data.token;
    const workspaceId = data.workspaceId;

    return NextResponse.json({ status: 200, ...data, redirectUrl });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}


