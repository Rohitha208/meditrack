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
 
// GET /api/companies/[id] - Get company by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = requireToken(request)
    if (denied) return denied

    const { id } = await params
 
    const response = await fetch(`${API_BASE_URL}/api/company/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader(request),
      },
    })
 
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        )
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }
 
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching company:', error)
    return NextResponse.json(
      { error: 'Failed to fetch company' },
      { status: 500 }
    )
  }
}
 
// PUT /api/companies/[id] - Update company by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = requireToken(request)
    if (denied) return denied

    const { id } = await params
    const contentType = request.headers.get("content-type") || "";

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
          return fetch(`${API_BASE_URL}/api/company/${id}/upload`, {
            method: "PUT",
            
            headers: authHeader(request),
            body: forwardForm,
          });
        })()
      : await (async () => {
          const body = await request.json();
          return fetch(`${API_BASE_URL}/api/company/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...authHeader(request),
            },
            body: JSON.stringify(body),
          });
        })();
 
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        )
      }
      const contentType = response.headers.get("content-type") || "";
      const text = await response.text().catch(() => "");
      if (contentType.includes("application/json")) {
        try {
          const json = text ? JSON.parse(text) : null;
          return NextResponse.json(json, { status: response.status });
        } catch {
          // fall through
        }
      }
      return new NextResponse(text, {
        status: response.status,
        headers: {
          "content-type": contentType || "text/plain; charset=utf-8",
        },
      });
    }
 
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating company:', error)
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    )
  }
}
 
// DELETE /api/companies/[id] - Delete company by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = requireToken(request)
    if (denied) return denied

    const { id } = await params
 
    const response = await fetch(`${API_BASE_URL}/api/company/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader(request),
      },
    })
 
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        )
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }
 
    // DELETE typically returns 204 No Content
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting company:', error)
    return NextResponse.json(
      { error: 'Failed to delete company' },
      { status: 500 }
    )
  }
}