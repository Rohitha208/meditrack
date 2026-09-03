export interface MediTrackTariff {
  id: string;
  service: string;
  code?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  rate?: string | null;
  gst?: string | null;
  effectiveDate?: string | null;
  upcomingRate?: string | null;
  upcomingRateDate?: string | null;
  hasScheduledChange?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MediTrackTariffRateHistory {
  id: string;
  tariffId: string;
  rate?: string | null;
  effectiveDate: string;
  isCurrent: boolean;
  createdAt: string;
}

export interface MediTrackPackage {
  id: string;
  code: string;
  name: string;
  fixedRate?: string | null;
  includedServices?: MediTrackTariff[] | null;
  effectiveDate?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedList<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export function normalizePaginated<T>(payload: unknown): PaginatedList<T> {
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const items = (Array.isArray(obj.items)
      ? obj.items
      : Array.isArray(obj.data)
        ? obj.data
        : Array.isArray(payload)
          ? payload
          : []) as T[];
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
