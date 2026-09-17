import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { PharmacyVisitOrder } from "./types";

export const PHARMACY_BASE = "/api/meditrack/opd/pharmacy";

export async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, fallback));
  }
  return result as T;
}

export function asVisitOrder(data: PharmacyVisitOrder): PharmacyVisitOrder {
  return {
    ...data,
    items: data.items ?? [],
    existingDispensing: data.existingDispensing
      ? { ...data.existingDispensing, items: data.existingDispensing.items ?? [] }
      : data.existingDispensing,
  };
}
