export const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isGuid(value?: string | null): value is string {
  return !!value && GUID_RE.test(value);
}

export interface DrugCatalogueItem {
  productId: string;
  brand?: string | null;
  compositionLabel?: string | null;
  generic?: string | null;
  dosageForm?: string | null;
  category?: string | null;
  schedule?: string | null;
  requiresDeclaration: boolean;
  doseUnit?: string | null;
  maxQuantityPerPrescription?: number | null;
  quantityLimitLabel?: string | null;
  sellingPrice?: number | null;
  stockOnHand?: number | null;
  alreadyOnPrescription: boolean;
}

export interface PrescribeDrugRequest {
  visitId: string;
  productId: string;
  doseAmount?: number | null;
  doseUnit?: string | null;
  frequency: string;
  duration?: number | null;
  durationUnit?: string | null;
  directions?: string | null;
  declarationSigned?: boolean;
  overrideReason?: string | null;
}

export interface PrescriptionPatient {
  patientId?: string | null;
  name?: string | null;
  uhid?: string | null;
  phone?: string | null;
  gender?: string | null;
  age?: number | null;
  departmentName?: string | null;
}

export interface PrescriptionLine {
  id: string;
  productId: string;
  brand?: string | null;
  generic?: string | null;
  compositionLabel?: string | null;
  doseAmount?: number | null;
  doseUnit?: string | null;
  frequency?: string | null;
  duration?: number | null;
  durationUnit?: string | null;
  quantity?: number | null;
  sig?: string | null;
  durationLabel?: string | null;
  directions?: string | null;
  schedule?: string | null;
  scheduleNote?: string | null;
  prescriberRegistrationNumber?: string | null;
  declarationSigned: boolean;
  overrideReason?: string | null;
  canRemove: boolean;
  createdAt?: string | null;
}

export interface PrescriptionInteraction {
  severity?: string | null;
  message?: string | null;
  genericA?: string | null;
  genericB?: string | null;
}

export interface PrescriptionView {
  prescriptionId?: string | null;
  visitId: string;
  prescriptionNumber?: string | null;
  status?: string | null;
  statusLabel?: string | null;
  patient?: PrescriptionPatient | null;
  prescribedByName?: string | null;
  prescriberRegistrationNumber?: string | null;
  sentToPharmacyAt?: string | null;
  lines: PrescriptionLine[];
  interactions: PrescriptionInteraction[];
  canEdit: boolean;
  canSendToPharmacy: boolean;
}

export interface DrugCatalogueParams {
  visitId?: string;
  search?: string;
  clinicId?: string;
  limit?: number;
}
