import type { PaginatedList } from "../tariffs/types";
import { normalizePaginated } from "../tariffs/types";

export interface MediTrackTpa {
  id: string;
  tpaName: string;
  payerType?: string | null;
  empanelmentStatus?: string | null;
  discountPercent?: string | null;
  overrideRates?: string | null;
  effectiveDate?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  clinicId?: string | null;
  clinicName?: string | null;
}

export type MediTrackTpaList = PaginatedList<MediTrackTpa>;

export { normalizePaginated };
