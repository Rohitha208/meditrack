import { NextRequest, NextResponse } from "next/server"
import { getJwtToken } from "@/utils/serverCookie"

const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}`
const testToken = `${process.env.NEXT_PUBLIC_TEST_TOKEN}`

// Backend endpoint that accepts the veterinary patient CSV/Excel import.
// The backend expects companyId as a query parameter and the file in the body.
const BACKEND_IMPORT_PATH = "/api/Patient/bulk-create"

// POST /api/patients/import → forwards multipart/form-data (CSV/Excel file) to backend
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // companyId is sent by the frontend either in the form body or the query
    // string; the backend wants it as a query parameter.
    const companyId =
      (formData.get("companyId") as string | null) ||
      new URL(request.url).searchParams.get("companyId") ||
      ""

    let token = getJwtToken(request)
    if (!token) token = testToken

    const backendUrl = `${apiUrl}${BACKEND_IMPORT_PATH}${
      companyId ? `?companyId=${encodeURIComponent(companyId)}` : ""
    }`

    // Forward the multipart body as-is. Do NOT set Content-Type manually so the
    // multipart boundary is preserved.
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    const contentType = response.headers.get("content-type") || ""
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => ({}))
      : { message: await response.text().catch(() => "") }

    if (!response.ok) {
      const message =
        (payload && (payload.message || payload.error || payload.title)) ||
        "Failed to import patients"
      return NextResponse.json({ message }, { status: response.status })
    }

    return NextResponse.json(payload, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      { message: `Error importing patients: ${error.message}` },
      { status: 500 }
    )
  }
}
