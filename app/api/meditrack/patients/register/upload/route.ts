import { NextRequest, NextResponse } from "next/server";
import { getJwtToken } from "@/utils/serverCookie";

const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}`;

export async function POST(request: NextRequest) {
  try {
    const token = getJwtToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const response = await fetch(`${apiUrl}/api/Patient/register/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        data ?? { message: "Failed to upload registration cards" },
        { status: response.status }
      );
    }

    return NextResponse.json(data ?? { message: "Cards attached successfully." }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: `Error uploading cards: ${error.message}` },
      { status: 500 }
    );
  }
}
