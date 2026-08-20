import type { PaginatedList } from "../tariffs/types";
import { normalizePaginated } from "../tariffs/types";

export interface MediTrackTpa {
  id: string;
  tpaName: string;
  discountPercent?: string | null;
  overrideRates?: string | null;
  effectiveDate?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MediTrackTpaList = PaginatedList<MediTrackTpa>;

export { normalizePaginated };
