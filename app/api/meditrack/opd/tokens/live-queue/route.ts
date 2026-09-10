import { NextRequest, NextResponse } from "next/server";
import { getJwtToken } from "@/utils/serverCookie";

const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}`;

const PASS_THROUGH = ["userId", "doctorId", "departmentId", "date", "companyId", "clinicId"];

export async function GET(request: NextRequest) {
  try {
    const token = getJwtToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams();
    PASS_THROUGH.forEach((key) => {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    });

    const response = await fetch(`${apiUrl}/api/OpdToken/live-queue?${params}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json({ message: data?.message || "Failed to load queue" }, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: `Error loading queue: ${error.message}` }, { status: 500 });
  }
}
