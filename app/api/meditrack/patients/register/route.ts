import { NextRequest, NextResponse } from "next/server";
import { getJwtToken } from "@/utils/serverCookie";

const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}`;

async function proxyJson(request: NextRequest, method: "POST" | "PUT") {
  try {
    const token = getJwtToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const response = await fetch(`${apiUrl}/api/Patient/register`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        data ?? { message: `Failed to ${method === "POST" ? "register" : "update"} patient` },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { message: `Error registering patient: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return proxyJson(request, "POST");
}

export async function PUT(request: NextRequest) {
  return proxyJson(request, "PUT");
}
