export interface MediTrackClinic {
  id: string;
  companyId?: string | null;
  companyName?: string | null;
  name: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  description?: string | null;
  taxId?: string | null;
  licenseNumber?: string | null;
  subscriptionStatus?: string | null;
  subscriptionExpiresAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface MediTrackClinicList {
  items: MediTrackClinic[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export function normalizeClinics(payload: unknown): MediTrackClinicList {
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const items = (Array.isArray(obj.items)
      ? obj.items
      : Array.isArray(obj.data)
        ? obj.data
        : Array.isArray(payload)
          ? payload
          : []) as MediTrackClinic[];
    return {
      items,
      totalCount: Number(obj.totalCount ?? items.length),
      pageNumber: Number(obj.pageNumber ?? 1),
      pageSize: Number(obj.pageSize ?? items.length),
      totalPages: Number(obj.totalPages ?? 1),
    };
  }
  return { items: [], totalCount: 0, pageNumber: 1, pageSize: 10, totalPages: 0 };
}
