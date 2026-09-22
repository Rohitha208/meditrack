import { NextRequest, NextResponse } from "next/server";
import { getJwtToken } from "@/utils/serverCookie";

const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}`;

async function proxy(request: NextRequest, path: string[], method: string) {
  try {
    const token = getJwtToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const qs = request.nextUrl.search;
    const joined = path.filter(Boolean).join("/");
    const url = `${apiUrl}/api/AdmissionReferral${joined ? `/${joined}` : ""}${qs}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    const init: RequestInit = { method, headers };
    if (method !== "GET" && method !== "HEAD") {
      const text = await request.text();
      if (text) init.body = text;
    }

    const response = await fetch(url, init);
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        (typeof data?.message === "string" && data.message) ||
        (typeof data?.Message === "string" && data.Message) ||
        (typeof data === "string" && data) ||
        "Admission referral request failed";
      return NextResponse.json({ message }, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ message: `Error calling admission referral: ${message}` }, { status: 500 });
  }
}

type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const { path = [] } = await ctx.params;
  return proxy(request, path, "GET");
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const { path = [] } = await ctx.params;
  return proxy(request, path, "POST");
}
