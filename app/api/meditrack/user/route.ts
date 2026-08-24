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
    const params = new URLSearchParams();
    params.set("pageNumber", searchParams.get("pageNumber") || "1");
    params.set("pageSize", searchParams.get("pageSize") || "100");
    params.set("paginationRequired", searchParams.get("paginationRequired") || "true");

    const companyId = searchParams.get("companyId");
    const search = searchParams.get("search");
    if (companyId) params.set("companyId", companyId);
    if (search) params.set("search", search);

    searchParams.getAll("roleIds").forEach((id) => {
      if (id) params.append("roleIds", id);
    });
    searchParams.getAll("clinicIds").forEach((id) => {
      if (id) params.append("clinicIds", id);
    });

    const response = await fetch(`${apiUrl}/api/User?${params.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        { message: errorData?.message || "Failed to fetch users" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: `Error fetching users: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getJwtToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const response = await fetch(`${apiUrl}/api/User`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        { message: errorData?.message || "Failed to create user" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: `Error creating user: ${error.message}` },
      { status: 500 }
    );
  }
}
