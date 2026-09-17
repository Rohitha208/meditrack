import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { DrugCatalogueItem, PrescriptionView } from "./types";

export const PRESCRIPTION_BASE = "/api/meditrack/opd/prescriptions";

export async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, fallback));
  }
  return result as T;
}

export function asCatalogue(data: unknown): DrugCatalogueItem[] {
  if (Array.isArray(data)) return data as DrugCatalogueItem[];
  if (data && typeof data === "object") {
    const record = data as { items?: DrugCatalogueItem[]; Items?: DrugCatalogueItem[] };
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.Items)) return record.Items;
  }
  return [];
}

export function asView(data: PrescriptionView): PrescriptionView {
  return {
    ...data,
    lines: data.lines ?? [],
    interactions: data.interactions ?? [],
  };
}
