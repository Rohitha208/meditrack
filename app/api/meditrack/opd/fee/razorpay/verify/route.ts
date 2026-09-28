import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getJwtToken } from "@/utils/serverCookie";

export async function POST(request: NextRequest) {
  try {
    const token = getJwtToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    if (!keySecret) {
      return NextResponse.json({ message: "Razorpay secret is not configured." }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const orderId = String(body?.razorpayOrderId || "");
    const paymentId = String(body?.razorpayPaymentId || "");
    const signature = String(body?.razorpaySignature || "");
    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ message: "Payment details are incomplete." }, { status: 400 });
    }

    const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
    if (expected !== signature) {
      return NextResponse.json({ message: "Razorpay signature did not match. Payment was not collected." }, { status: 400 });
    }

    return NextResponse.json({ ok: true, paymentId, orderId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Razorpay verify failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
