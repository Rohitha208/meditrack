import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

export function isRazorpayMethod(method?: string | null) {
  const value = (method || "").toLowerCase();
  return value.includes("upi") || value.includes("card");
}

export interface RazorpayOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface RazorpayCheckoutResult {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

function loadCheckoutScript() {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export const createRazorpayOrder = async (amount: number, receipt?: string): Promise<RazorpayOrder> => {
  const response = await fetch("/api/meditrack/opd/fee/razorpay/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, receipt }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Could not start Razorpay checkout"));
  }
  return result as RazorpayOrder;
};

export const verifyRazorpayPayment = async (payload: RazorpayCheckoutResult): Promise<string> => {
  const response = await fetch("/api/meditrack/opd/fee/razorpay/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Razorpay payment could not be verified"));
  }
  return String(result.paymentId || payload.razorpayPaymentId);
};

export async function openRazorpayCheckout(params: {
  order: RazorpayOrder;
  name?: string;
  description?: string;
  prefillName?: string;
  prefillContact?: string;
  preferredMethod?: "upi" | "card";
}): Promise<RazorpayCheckoutResult> {
  const ready = await loadCheckoutScript();
  const RazorpayCheckout = window.Razorpay;
  if (!ready || !RazorpayCheckout) {
    throw new Error("Could not load Razorpay checkout. Check your network and try again.");
  }

  const preferredMethod = params.preferredMethod || "upi";

  return new Promise((resolve, reject) => {
    const checkout = new RazorpayCheckout({
      key: params.order.keyId,
      amount: params.order.amount,
      currency: params.order.currency,
      name: params.name || "MediTrack OPD",
      description: params.description || "Consultation fee",
      order_id: params.order.orderId,
      method: preferredMethod,
      prefill: {
        name: params.prefillName || "",
        contact: params.prefillContact || "",
        method: preferredMethod,
      },
      config: {
        display: {
          blocks: {
            upi: {
              name: "UPI",
              instruments: [{ method: "upi" }],
            },
          },
          sequence: ["block.upi"],
          preferences: { show_default_blocks: true },
        },
      },
      theme: { color: "#33456e" },
      handler: (response: {
        razorpay_payment_id?: string;
        razorpay_order_id?: string;
        razorpay_signature?: string;
      }) => {
        if (!response.razorpay_payment_id || !response.razorpay_order_id || !response.razorpay_signature) {
          reject(new Error("Razorpay did not return a complete payment."));
          return;
        }
        resolve({
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId: response.razorpay_order_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled.")),
      },
    });
    checkout.on("payment.failed", (response) => {
      reject(new Error(response?.error?.description || "Razorpay payment failed."));
    });
    checkout.open();
  });
}
