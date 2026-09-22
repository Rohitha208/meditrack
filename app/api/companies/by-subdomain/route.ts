import { NextRequest, NextResponse } from "next/server";
import { getJwtToken } from "@/utils/serverCookie";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

function authHeader(request: NextRequest): Record<string, string> {
  const token = getJwtToken(request);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function GET(request: NextRequest) {
  try {
    const subdomain = new URL(request.url).searchParams.get("subdomain");
    if (!subdomain) {
      return NextResponse.json({ message: "Subdomain is required" }, { status: 400 });
    }

    const response = await fetch(
      `${API_BASE_URL}/api/company/by-subdomain?subdomain=${encodeURIComponent(subdomain)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(request),
        },
      }
    );

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        (typeof data?.message === "string" && data.message) ||
        "Failed to fetch company data";
      return NextResponse.json({ message }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching company by subdomain:", error);
    return NextResponse.json({ message: "Failed to fetch company data" }, { status: 500 });
  }
}
