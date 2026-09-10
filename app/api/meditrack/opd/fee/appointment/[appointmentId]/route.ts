import { NextRequest, NextResponse } from "next/server";
import { getJwtToken } from "@/utils/serverCookie";

const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}`;

export async function GET(request: NextRequest, ctx: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await ctx.params;
  try {
    const token = getJwtToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${apiUrl}/api/OpdFeeCollection/appointment/${appointmentId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    // No fee collected yet is a normal state for this screen, not an error.
    if (response.status === 404) {
      return NextResponse.json(null, { status: 200 });
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || "Failed to load fee collection" },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: `Error loading fee collection: ${error.message}` },
      { status: 500 }
    );
  }
}
