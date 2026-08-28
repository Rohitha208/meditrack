export interface BedCategory {
  id: string;
  companyId?: string | null;
  clinicId?: string | null;
  clinicName?: string | null;
  name: string;
  code?: string | null;
  description?: string | null;
  tariffId?: string | null;
  tariffName?: string | null;
  tariffRate?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export function normalizeBedCategories(payload: unknown): BedCategory[] {
  if (Array.isArray(payload)) return payload as BedCategory[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as BedCategory[];
    if (Array.isArray(obj.items)) return obj.items as BedCategory[];
  }
  return [];
}
