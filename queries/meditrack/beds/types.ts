export const BED_STATUSES = ["Vacant", "Occupied", "Cleaning", "OutOfService"] as const;
export type ApiBedStatus = (typeof BED_STATUSES)[number];
export type UiBedStatus = "Vacant" | "Occupied" | "Cleaning" | "Out of service";

export interface Bed {
  id: string;
  companyId?: string | null;
  wardId: string;
  wardName?: string | null;
  bedNumber: string;
  status: string;
  patientId?: string | null;
  patientName?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export function normalizeBeds(payload: unknown): Bed[] {
  if (Array.isArray(payload)) return payload as Bed[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as Bed[];
    if (Array.isArray(obj.items)) return obj.items as Bed[];
  }
  return [];
}

export function toUiBedStatus(status?: string | null): UiBedStatus {
  const value = (status || "Vacant").replace(/\s/g, "").toLowerCase();
  if (value === "occupied") return "Occupied";
  if (value === "cleaning") return "Cleaning";
  if (value === "outofservice") return "Out of service";
  return "Vacant";
}

export function toApiBedStatus(status: UiBedStatus | string): ApiBedStatus {
  const value = status.replace(/\s/g, "").toLowerCase();
  if (value === "occupied") return "Occupied";
  if (value === "cleaning") return "Cleaning";
  if (value === "outofservice") return "OutOfService";
  return "Vacant";
}
