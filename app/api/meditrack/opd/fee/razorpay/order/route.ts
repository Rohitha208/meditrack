import { NextRequest, NextResponse } from "next/server";
import { getJwtToken } from "@/utils/serverCookie";

function razorpayAuthHeader() {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  if (!keyId || !keySecret) return null;
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export async function POST(request: NextRequest) {
  try {
    const token = getJwtToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const auth = razorpayAuthHeader();
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
    if (!auth || !keyId) {
      return NextResponse.json(
        { message: "Razorpay test keys are missing. Add NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env, then restart Next.js." },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const amountRupees = Number(body?.amount);
    if (!Number.isFinite(amountRupees) || amountRupees <= 0) {
      return NextResponse.json({ message: "A payable amount is required." }, { status: 400 });
    }

    const amountPaise = Math.round(amountRupees * 100);
    const receipt = String(body?.receipt || `opd-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || `opd${Date.now()}`;

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { message: data?.error?.description || data?.message || "Could not start Razorpay checkout." },
        { status: response.status }
      );
    }

    return NextResponse.json({
      orderId: data.id,
      amount: data.amount,
      currency: data.currency || "INR",
      keyId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Razorpay order failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
