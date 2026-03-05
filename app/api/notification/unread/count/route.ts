import { NextRequest, NextResponse } from "next/server";
import { getJwtToken } from "@/utils/serverCookie";

const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}`;
const testToken = `${process.env.NEXT_PUBLIC_TEST_TOKEN}`;

export async function GET(request: NextRequest) {
  try {
    let token = getJwtToken(request);
    if (!token) token = testToken;

    // Get parameters from query string
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get('clinicId');
    const clientId = searchParams.get('clientId');

    // Build API URL with appropriate parameter
    const params = new URLSearchParams();
    if (clinicId) params.append('clinicId', clinicId);
    if (clientId) params.append('clientId', clientId);

    const apiUrlWithParams = params.toString() 
      ? `${apiUrl}/api/Notification/unread/count?${params.toString()}`
      : `${apiUrl}/api/Notification/unread/count`;

    const response = await fetch(apiUrlWithParams, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error fetching unread notification count:", errorData);
      return NextResponse.json(
        { message: "Failed to fetch unread notification count" },
        { status: response.status }
      );
    }

    const data = await response.json(); // { count: number }
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error in unread notification count route:", error);
    return NextResponse.json(
      { message: "Error fetching unread notification count" },
      { status: 500 }
    );
  }
}
