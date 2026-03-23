import { NextResponse, NextRequest } from 'next/server';
import { getJwtToken } from "@/utils/serverCookie";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: NextRequest) {
  const token = getJwtToken(request);
  const url = new URL(request.url);
  const isRead = url.searchParams.get('isRead');
  const clinicId = url.searchParams.get('clinicId');
  const clientId = url.searchParams.get('clientId');

  const params = new URLSearchParams();
  if (isRead) params.append('isRead', isRead);
  if (clinicId) params.append('clinicId', clinicId);
  if (clientId) params.append('clientId', clientId);

  const response = await fetch(`${apiUrl}/api/Notification?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  return NextResponse.json(data);
}



export async function POST(request: NextRequest) {
    try {
    const body = await request.json();
    
    let token = getJwtToken(request);

        const response = await fetch(
            `${apiUrl}/api/Notification`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            }
        );

        if (!response.ok) {
            const errorText = await response.text().catch(() => "Failed to get error details");
            console.error("Error response from backend:", errorText);
            throw new Error('Failed to create notification');
        }

        const data = await response.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error: any) {
        console.error("Error in notifications POST route:", error);
        return NextResponse.json(
            { message: `Error creating notification: ${error.message}` },
            { status: 500 }
        );
    }
}

