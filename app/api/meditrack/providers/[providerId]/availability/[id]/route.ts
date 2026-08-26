import { NextRequest, NextResponse } from "next/server";
import { getJwtToken } from "@/utils/serverCookie";

const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}`;

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ providerId: string; id: string }> }
) {
  const { providerId, id } = await ctx.params;
  try {
    const token = getJwtToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${apiUrl}/api/providers/${providerId}/availability/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok && response.status !== 204) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        { message: errorData?.message || "Failed to delete availability session" },
        { status: response.status }
      );
    }

    return NextResponse.json({ message: "Availability session deleted" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: `Error deleting availability session: ${error.message}` },
      { status: 500 }
    );
  }
}
