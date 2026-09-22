export type VisitClosureStatusValue = "open" | "pending" | "closed" | "converted_to_ipd" | string;

export interface VisitLabTest {
  testName: string;
  status?: string | null;
  orderedDate?: string | null;
  resultDate?: string | null;
}

export interface VisitClosureStatus {
  visitId: string;
  closureStatus: VisitClosureStatusValue;
  pendingItems: string[];
  admissionReferralCode?: string | null;
  admissionReferralStatus?: string | null;
  patientId?: string | null;
  patientName?: string | null;
  patientUhid?: string | null;
  patientPhone?: string | null;
  patientAddress?: string | null;
  doctorId?: string | null;
  doctorName?: string | null;
  visitDate?: string | null;
  chiefComplaint?: string | null;
  diagnosis?: string | null;
  treatmentPlan?: string | null;
  outcome?: string | null;
  labTests: VisitLabTest[];
  prescriptionNotes?: string | null;
  prescriptionItemCount: number;
  hasControlledSubstances: boolean;
  consultationAmountCollected?: number | null;
  consultationReceiptNumber?: string | null;
  consultationPaymentMethod?: string | null;
  pharmacyAmountCollected?: number | null;
  pharmacyReceiptNumber?: string | null;
  pharmacyPaymentMethod?: string | null;
  pharmacyHasControlledSubstances: boolean;
}

export interface CloseVisitResponse {
  visitId: string;
  closureStatus: VisitClosureStatusValue;
  admissionReferralCode?: string | null;
}

export interface ReopenVisitRequest {
  visitId: string;
  reason: string;
}

export interface VisitBalanceDueItem {
  orderId: string;
  testName: string;
  testCode?: string | null;
  orderNumber?: string | null;
  amount: number;
  overrideReason?: string | null;
}

export interface VisitBalanceCoverageItem {
  orderId: string;
  testName: string;
  testCode?: string | null;
  tpaName?: string | null;
  tpaPreauthRef?: string | null;
  amount: number;
}

export interface VisitBalanceCollectedItem {
  source: string;
  description: string;
  amount: number;
  paymentMethod?: string | null;
  receiptNumber?: string | null;
}

export interface VisitBalance {
  visitId: string;
  balanceState: string;
  payableNow: number;
  totalAlreadyCollected: number;
  grandTotal: number;
  dueItems: VisitBalanceDueItem[];
  coverageConfirmedItems: VisitBalanceCoverageItem[];
  alreadyCollectedItems: VisitBalanceCollectedItem[];
}

export interface CollectVisitBalanceRequest {
  visitId: string;
  paymentMethod: string;
}

export interface CollectVisitBalanceResponse {
  receiptNumber: string;
  amountCollected: number;
  updatedBalance: VisitBalance;
}

export interface OverrideVisitBalanceRequest {
  visitId: string;
  reason: string;
}

export interface OverrideVisitBalanceResponse {
  itemsOverridden: number;
  amountOverridden: number;
  updatedBalance: VisitBalance;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return value == null ? "" : String(value);
}

function asNullableString(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asNullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

export function normalizeLabTest(raw: unknown): VisitLabTest {
  const o = asRecord(raw);
  return {
    testName: asString(o.testName ?? o.TestName),
    status: asNullableString(o.status ?? o.Status),
    orderedDate: asNullableString(o.orderedDate ?? o.OrderedDate),
    resultDate: asNullableString(o.resultDate ?? o.ResultDate),
  };
}

export function normalizeVisitClosureStatus(raw: unknown): VisitClosureStatus {
  const o = asRecord(raw);
  const labTestsRaw = o.labTests ?? o.LabTests;
  return {
    visitId: asString(o.visitId ?? o.VisitId),
    closureStatus: asString(o.closureStatus ?? o.ClosureStatus) || "open",
    pendingItems: asStringList(o.pendingItems ?? o.PendingItems),
    admissionReferralCode: asNullableString(o.admissionReferralCode ?? o.AdmissionReferralCode),
    admissionReferralStatus: asNullableString(o.admissionReferralStatus ?? o.AdmissionReferralStatus),
    patientId: asNullableString(o.patientId ?? o.PatientId),
    patientName: asNullableString(o.patientName ?? o.PatientName),
    patientUhid: asNullableString(o.patientUhid ?? o.PatientUhid),
    patientPhone: asNullableString(o.patientPhone ?? o.PatientPhone),
    patientAddress: asNullableString(o.patientAddress ?? o.PatientAddress),
    doctorId: asNullableString(o.doctorId ?? o.DoctorId),
    doctorName: asNullableString(o.doctorName ?? o.DoctorName),
    visitDate: asNullableString(o.visitDate ?? o.VisitDate),
    chiefComplaint: asNullableString(o.chiefComplaint ?? o.ChiefComplaint),
    diagnosis: asNullableString(o.diagnosis ?? o.Diagnosis),
    treatmentPlan: asNullableString(o.treatmentPlan ?? o.TreatmentPlan),
    outcome: asNullableString(o.outcome ?? o.Outcome),
    labTests: Array.isArray(labTestsRaw) ? labTestsRaw.map(normalizeLabTest) : [],
    prescriptionNotes: asNullableString(o.prescriptionNotes ?? o.PrescriptionNotes),
    prescriptionItemCount: asNumber(o.prescriptionItemCount ?? o.PrescriptionItemCount),
    hasControlledSubstances: Boolean(o.hasControlledSubstances ?? o.HasControlledSubstances),
    consultationAmountCollected: asNullableNumber(o.consultationAmountCollected ?? o.ConsultationAmountCollected),
    consultationReceiptNumber: asNullableString(o.consultationReceiptNumber ?? o.ConsultationReceiptNumber),
    consultationPaymentMethod: asNullableString(o.consultationPaymentMethod ?? o.ConsultationPaymentMethod),
    pharmacyAmountCollected: asNullableNumber(o.pharmacyAmountCollected ?? o.PharmacyAmountCollected),
    pharmacyReceiptNumber: asNullableString(o.pharmacyReceiptNumber ?? o.PharmacyReceiptNumber),
    pharmacyPaymentMethod: asNullableString(o.pharmacyPaymentMethod ?? o.PharmacyPaymentMethod),
    pharmacyHasControlledSubstances: Boolean(o.pharmacyHasControlledSubstances ?? o.PharmacyHasControlledSubstances),
  };
}

export function normalizeCloseVisitResponse(raw: unknown): CloseVisitResponse {
  const o = asRecord(raw);
  return {
    visitId: asString(o.visitId ?? o.VisitId),
    closureStatus: asString(o.closureStatus ?? o.ClosureStatus),
    admissionReferralCode: asNullableString(o.admissionReferralCode ?? o.AdmissionReferralCode),
  };
}

export function normalizeDueItem(raw: unknown): VisitBalanceDueItem {
  const o = asRecord(raw);
  return {
    orderId: asString(o.orderId ?? o.OrderId),
    testName: asString(o.testName ?? o.TestName),
    testCode: asNullableString(o.testCode ?? o.TestCode),
    orderNumber: asNullableString(o.orderNumber ?? o.OrderNumber),
    amount: asNumber(o.amount ?? o.Amount),
    overrideReason: asNullableString(o.overrideReason ?? o.OverrideReason),
  };
}

export function normalizeCoverageItem(raw: unknown): VisitBalanceCoverageItem {
  const o = asRecord(raw);
  return {
    orderId: asString(o.orderId ?? o.OrderId),
    testName: asString(o.testName ?? o.TestName),
    testCode: asNullableString(o.testCode ?? o.TestCode),
    tpaName: asNullableString(o.tpaName ?? o.TpaName),
    tpaPreauthRef: asNullableString(o.tpaPreauthRef ?? o.TpaPreauthRef),
    amount: asNumber(o.amount ?? o.Amount),
  };
}

export function normalizeCollectedItem(raw: unknown): VisitBalanceCollectedItem {
  const o = asRecord(raw);
  return {
    source: asString(o.source ?? o.Source),
    description: asString(o.description ?? o.Description),
    amount: asNumber(o.amount ?? o.Amount),
    paymentMethod: asNullableString(o.paymentMethod ?? o.PaymentMethod),
    receiptNumber: asNullableString(o.receiptNumber ?? o.ReceiptNumber),
  };
}

export function normalizeVisitBalance(raw: unknown): VisitBalance {
  const o = asRecord(raw);
  const due = o.dueItems ?? o.DueItems;
  const coverage = o.coverageConfirmedItems ?? o.CoverageConfirmedItems;
  const collected = o.alreadyCollectedItems ?? o.AlreadyCollectedItems;
  return {
    visitId: asString(o.visitId ?? o.VisitId),
    balanceState: asString(o.balanceState ?? o.BalanceState) || "Zero balance",
    payableNow: asNumber(o.payableNow ?? o.PayableNow),
    totalAlreadyCollected: asNumber(o.totalAlreadyCollected ?? o.TotalAlreadyCollected),
    grandTotal: asNumber(o.grandTotal ?? o.GrandTotal),
    dueItems: Array.isArray(due) ? due.map(normalizeDueItem) : [],
    coverageConfirmedItems: Array.isArray(coverage) ? coverage.map(normalizeCoverageItem) : [],
    alreadyCollectedItems: Array.isArray(collected) ? collected.map(normalizeCollectedItem) : [],
  };
}

export function normalizeCollectVisitBalanceResponse(raw: unknown): CollectVisitBalanceResponse {
  const o = asRecord(raw);
  return {
    receiptNumber: asString(o.receiptNumber ?? o.ReceiptNumber),
    amountCollected: asNumber(o.amountCollected ?? o.AmountCollected),
    updatedBalance: normalizeVisitBalance(o.updatedBalance ?? o.UpdatedBalance),
  };
}

export function normalizeOverrideVisitBalanceResponse(raw: unknown): OverrideVisitBalanceResponse {
  const o = asRecord(raw);
  return {
    itemsOverridden: asNumber(o.itemsOverridden ?? o.ItemsOverridden),
    amountOverridden: asNumber(o.amountOverridden ?? o.AmountOverridden),
    updatedBalance: normalizeVisitBalance(o.updatedBalance ?? o.UpdatedBalance),
  };
}
