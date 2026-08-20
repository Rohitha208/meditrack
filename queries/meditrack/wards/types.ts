export interface MediTrackWard {
  id: string;
  companyId?: string | null;
  clinicId?: string | null;
  code?: string | null;
  name: string;
  sanctioned: number;
  headUserId?: string | null;
  headUserName?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export function normalizeWards(payload: unknown): MediTrackWard[] {
  if (Array.isArray(payload)) return payload as MediTrackWard[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as MediTrackWard[];
    if (Array.isArray(obj.items)) return obj.items as MediTrackWard[];
  }
  return [];
}
