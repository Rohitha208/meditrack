import { NextRequest, NextResponse } from 'next/server'
import { getJwtToken } from '@/utils/serverCookie'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

 
function authHeader(request: NextRequest): Record<string, string> {
  const token = getJwtToken(request)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function requireToken(request: NextRequest) {
  return getJwtToken(request)
    ? null
    : NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
}

async function toProxyResponse(upstream: Response) {
  const contentType = upstream.headers.get("content-type") || "";
  const status = upstream.status;
  const text = await upstream.text().catch(() => "");

  // Try JSON first
  if (contentType.includes("application/json")) {
    try {
      const json = text ? JSON.parse(text) : null;
      return NextResponse.json(json, { status });
    } catch {
      // fall through to text
    }
  }

  return new NextResponse(text, {
    status,
    headers: {
      "content-type": contentType || "text/plain; charset=utf-8",
    },
  });
}

// GET /api/companies - Get companies with optional pagination
export async function GET(request: NextRequest) {
  try {
    const denied = requireToken(request)
    if (denied) return denied

    const { searchParams } = new URL(request.url);
    const pageNumber = searchParams.get('pageNumber');
    const pageSize = searchParams.get('pageSize');
    const paginationRequired = searchParams.get('paginationRequired');
    const search = searchParams.get('search');
    const params = new URLSearchParams();
    if (pageNumber) params.set('pageNumber', pageNumber);
    if (pageSize) params.set('pageSize', pageSize);
    // Always enforce pagination on the backend
    params.set('paginationRequired', 'true');
    if (search && search !== "undefined" && search !== "null") {
      params.set("search", search);  // Use set instead of append to avoid duplicates
    }
    const qs = params.toString();
    const response = await fetch(`${API_BASE_URL}/api/company${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader(request),
      },
    })

    if (!response.ok) {
      return toProxyResponse(response)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching companies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    )
  }
}

// POST /api/companies - Create a new company
export async function POST(request: NextRequest) {
  try {
    const denied = requireToken(request)
    if (denied) return denied

    const contentType = request.headers.get("content-type") || "";

    // Multipart: forward to POST /api/company/upload (individual form fields + optional file).
    const response = contentType.includes("multipart/form-data")
      ? await (async () => {
          const form = await request.formData();
          const forwardForm = new FormData();
          for (const [key, value] of form.entries()) {
            if (value instanceof File) {
              forwardForm.set(key, value, value.name);
            } else {
              forwardForm.set(key, String(value ?? ""));
            }
          }
          return fetch(`${API_BASE_URL}/api/company/upload`, {
            method: "POST",
            headers: authHeader(request),
            body: forwardForm,
          });
        })()
      : await (async () => {
          const body = await request.json();
          return fetch(`${API_BASE_URL}/api/company`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...authHeader(request),
            },
            body: JSON.stringify(body),
          });
        })();

    if (!response.ok) {
      return toProxyResponse(response)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    )
  }
}