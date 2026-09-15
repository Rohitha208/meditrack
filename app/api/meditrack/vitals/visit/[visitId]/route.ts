import { NextRequest, NextResponse } from "next/server";
import { getJwtToken } from "@/utils/serverCookie";

const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}`;

export async function GET(request: NextRequest, { params }: { params: Promise<{ visitId: string }> }) {
  try {
    const token = getJwtToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { visitId } = await params;
    if (!visitId) {
      return NextResponse.json({ message: "Visit id is required." }, { status: 400 });
    }

    const response = await fetch(`${apiUrl}/api/VitalDetail/visit/${visitId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 404) {
      return NextResponse.json(null, { status: 200 });
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || data?.Message || data || "Failed to load vitals" },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ message: `Error loading vitals: ${message}` }, { status: 500 });
  }
}
