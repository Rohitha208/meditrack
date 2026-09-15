export interface DiagnosticCatalogueItem {
  labTestId: string;
  name?: string | null;
  code?: string | null;
  category?: string | null;
  modality?: string | null;
  sampleType?: string | null;
  unit?: string | null;
  tat?: string | null;
  tariffId?: string | null;
  amount?: number | null;
  hasRate: boolean;
  categoryLabel?: string | null;
  alreadyOnVisit: boolean;
  existingStatusLabel?: string | null;
}

export interface DiagnosticOrderLine {
  labTestId: string;
  orderNote?: string | null;
  amount?: number | null;
  priority?: string | null;
  allowDuplicate?: boolean;
}

export interface CreateDiagnosticOrderRequest {
  visitId: string;
  tests: DiagnosticOrderLine[];
  paymentMethod?: string | null;
  tpaName?: string | null;
  tpaPreauthRef?: string | null;
}

export interface DiagnosticSpecimen {
  id: string;
  attemptNo: number;
  specimenNumber?: string | null;
  barcode?: string | null;
  status?: string | null;
  collectedByName?: string | null;
  collectedAt: string;
  rejectionReason?: string | null;
  rejectedByName?: string | null;
  rejectedAt?: string | null;
  line?: string | null;
}

export interface DiagnosticWorklistItem {
  orderId: string;
  visitId: string;
  orderNumber?: string | null;
  testName?: string | null;
  modality?: string | null;
  patientId?: string | null;
  patientName?: string | null;
  patientUhid?: string | null;
  specimenLine?: string | null;
  priority?: string | null;
  statusLabel?: string | null;
  collectionAttempt: number;
  orderedByName?: string | null;
  orderedAt?: string | null;
  paymentLine?: string | null;
  sampleCollectedAt?: string | null;
  collectedByName?: string | null;
  specimenBarcode?: string | null;
  equipmentUsed?: string | null;
  canCollect: boolean;
  canEnterResult: boolean;
  waitingLabel?: string | null;
  isOverdue: boolean;
  unit?: string | null;
  normalRange?: string | null;
  criticalLow?: number | null;
  criticalHigh?: number | null;
  specimenNumber?: string | null;
  attempts: DiagnosticSpecimen[];
  recollectionReason?: string | null;
}

export interface DiagnosticWorklist {
  awaitingCount: number;
  upstreamCount: number;
  items: DiagnosticWorklistItem[];
}

export interface DiagnosticWorklistParams {
  modality?: string;
  clinicId?: string;
  date?: string;
  includeDone?: boolean;
  stage?: "collection" | "result-entry";
  overdueAfterMinutes?: number;
}

export interface DiagnosticPatient {
  patientId?: string | null;
  name?: string | null;
  uhid?: string | null;
  phone?: string | null;
  gender?: string | null;
  age?: number | null;
  departmentName?: string | null;
  providerName?: string | null;
}

export interface DiagnosticResult {
  id: string;
  orderId: string;
  valueText?: string | null;
  valueNumeric?: number | null;
  unit?: string | null;
  referenceRange?: string | null;
  abnormalFlag?: string | null;
  display?: string | null;
  status?: string | null;
  patientFileId?: string | null;
  enteredByName?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  isSuperseded: boolean;
  amendmentReason?: string | null;
  wasReviewed: boolean;
  canAmend: boolean;
  canReview: boolean;
  createdAt?: string | null;
}

export interface DiagnosticOrder {
  id: string;
  orderNumber?: string | null;
  labTestId: string;
  testName?: string | null;
  modality?: string | null;
  amount: number;
  feeItemId?: string | null;
  feeVoided: boolean;
  orderedByName?: string | null;
  orderNote?: string | null;
  priority?: string | null;
  tpaName?: string | null;
  tpaPreauthRef?: string | null;
  status?: string | null;
  statusLabel?: string | null;
  sampleCollectedAt?: string | null;
  sampleReceivedAt?: string | null;
  reportedAt?: string | null;
  tatMinutes?: number | null;
  isVoid: boolean;
  voidReason?: string | null;
  canEdit: boolean;
  canVoid: boolean;
  canCollectSample: boolean;
  canEnterResult: boolean;
  result?: DiagnosticResult | null;
  history: DiagnosticResult[];
  createdAt?: string | null;
}

export interface DiagnosticCriticalAlert {
  orderId: string;
  resultId: string;
  testName?: string | null;
  display?: string | null;
  notifiedDoctor: boolean;
}

export interface DiagnosticVisitView {
  visitId: string;
  patient?: DiagnosticPatient | null;
  tpaLabel?: string | null;
  orders: DiagnosticOrder[];
  criticalAlerts: DiagnosticCriticalAlert[];
  hasPendingWork: boolean;
}

export interface CollectSampleRequest {
  sampleCollectedAt?: string | null;
  sampleReceivedAt?: string | null;
  specimenBarcode?: string | null;
  equipmentUsed?: string | null;
}

export interface CreateDiagnosticResultRequest {
  valueText?: string | null;
  valueNumeric?: number | null;
  unit?: string | null;
  referenceRange?: string | null;
  status?: string | null;
  patientFileId?: string | null;
}

export interface AmendDiagnosticResultRequest extends CreateDiagnosticResultRequest {
  reason: string;
}

export const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isGuid(value?: string | null): value is string {
  return !!value && GUID_RE.test(value);
}
