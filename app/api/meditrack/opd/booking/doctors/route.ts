import { NextRequest, NextResponse } from "next/server";
import { getJwtToken } from "@/utils/serverCookie";

const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}`;

export async function GET(request: NextRequest) {
  try {
    const token = getJwtToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("departmentId");
    if (!departmentId) {
      return NextResponse.json({ message: "departmentId is required" }, { status: 400 });
    }

    const params = new URLSearchParams({ departmentId });
    const clinicId = searchParams.get("clinicId");
    const roleValue = searchParams.get("roleValue");
    if (clinicId) params.set("clinicId", clinicId);
    if (roleValue) params.set("roleValue", roleValue);

    const response = await fetch(`${apiUrl}/api/opd/booking/doctors?${params}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        { message: errorData?.message || "Failed to fetch department doctors" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: `Error fetching department doctors: ${error.message}` },
      { status: 500 }
    );
  }
}
