import { NextRequest, NextResponse } from "next/server";
import { getJwtToken } from "@/utils/serverCookie";

const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}`;

const PASS_THROUGH = ["appointmentId", "patientId", "userId", "departmentId", "clinicId"];

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

    const response = await fetch(`${apiUrl}/api/OpdFeeCollection/estimate?${params}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        { message: errorData?.message || "Failed to load fee estimate" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: `Error loading fee estimate: ${error.message}` },
      { status: 500 }
    );
  }
}
