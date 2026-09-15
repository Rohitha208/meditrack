import type { PaginatedList } from "../tariffs/types";
import { normalizePaginated } from "../tariffs/types";

export interface MediTrackDrug {
  id: string;
  name: string;
  schedule?: string | null;
  unit?: string | null;
  hsnCode?: string | null;
  isActive: boolean;
  lastUpdated?: string | null;
  clinicId?: string | null;
  clinicName?: string | null;
}

export interface MediTrackLabTest {
  id: string;
  name: string;
  code?: string | null;
  category?: string | null;
  modality?: string | null;
  typeLabel?: string | null;
  rate?: number | null;
  sampleType?: string | null;
  tat?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  clinicId?: string | null;
  clinicName?: string | null;
}

export interface TestCategoryOption {
  name: string;
  modality: string;
}

export interface MediTrackDiagnosisCode {
  id: string;
  code: string;
  description?: string | null;
  icdVersion: string;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  clinicId?: string | null;
  clinicName?: string | null;
}

export interface MediTrackStock {
  id: string;
  drugId?: string | null;
  drugName?: string | null;
  batch?: string | null;
  expiry?: string | null;
  quantityOnHand: number;
  status?: string | null;
  lastUpdated?: string | null;
  drugCreated?: boolean;
  clinicId?: string | null;
  clinicName?: string | null;
}

export type MediTrackDrugList = PaginatedList<MediTrackDrug>;
export type MediTrackLabTestList = PaginatedList<MediTrackLabTest>;
export type MediTrackDiagnosisCodeList = PaginatedList<MediTrackDiagnosisCode>;
export type MediTrackStockList = PaginatedList<MediTrackStock>;

export { normalizePaginated };
