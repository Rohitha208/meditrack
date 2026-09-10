export interface FeeItem {
  id: string;
  tariffId?: string | null;
  chargeName: string;
  amount: number;
  isVoid: boolean;
  voidReason?: string | null;
}

export interface FeeEstimateParams {
  appointmentId?: string;
  patientId?: string;
  userId?: string;
  departmentId?: string;
  clinicId?: string;
}

export interface FeeEstimate {
  appointmentId?: string | null;
  appointmentReference?: string | null;
  patientId?: string | null;
  patientName?: string | null;
  patientUhid?: string | null;
  patientPhone?: string | null;
  userId?: string | null;
  userName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  clinicId?: string | null;
  visitType: string;
  charges: FeeItem[];
  totalPayable: number;
  availablePaymentMethods: string[];
}

export interface CollectFeeCharge {
  tariffId?: string | null;
  chargeName?: string | null;
  amount: number;
}

export interface CollectFeeRequest {
  appointmentId?: string | null;
  patientId?: string | null;
  userId: string;
  departmentId?: string | null;
  clinicId?: string | null;
  paymentMethod: string;
  transactionReference?: string | null;
  notes?: string | null;
  isWaived?: boolean;
  waiverReason?: string | null;
  discountAmount?: number;
  charges?: CollectFeeCharge[];
  visitType?: string | null;
  tokenDate?: string | null;
}

export type OpdTokenStatusValue = "Waiting" | "InConsultation" | "Completed" | "Missed" | "Cancelled";

export interface OpdToken {
  id: string;
  companyId: string;
  clinicId: string;
  userId: string;
  roleId?: string | null;
  userName: string;
  departmentId?: string | null;
  departmentName: string;
  patientId?: string | null;
  patientName: string;
  appointmentId?: string | null;
  tokenNumber: string;
  sequenceNumber: number;
  visitType: string;
  status: OpdTokenStatusValue | string;
  tokenDate: string;
  estimatedWaitMinutes: number;
  waitTimeLabel: string;
  estimatedStartTime?: string | null;
  missedReason?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface OpdFeeCollection {
  id: string;
  companyId: string;
  clinicId?: string | null;
  appointmentId?: string | null;
  patientId?: string | null;
  patientName?: string | null;
  patientUhid?: string | null;
  patientPhone?: string | null;
  userId: string;
  userName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  receiptNumber: string;
  totalAmount: number;
  discountAmount: number;
  amountPaid: number;
  paymentMethod: string;
  paymentStatus: string;
  isWaived: boolean;
  waiverReason?: string | null;
  transactionReference?: string | null;
  notes?: string | null;
  charges: FeeItem[];
  createdAt: string;
  token?: OpdToken | null;
}

export interface QueueSummary {
  totalTokensIssued: number;
  inConsultationCount: number;
  waitingCount: number;
  completedCount: number;
  missedCount: number;
  cancelledCount: number;
  doctorDelayMinutes: number;
}

export interface LiveQueue {
  userId?: string | null;
  userName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  queueDate: string;
  doctorDelayMinutes: number;
  statusAlertMessage?: string | null;
  activeQueue: OpdToken[];
  missedTokens: OpdToken[];
  summary: QueueSummary;
}

export interface LiveQueueParams {
  userId?: string;
  departmentId?: string;
  clinicId?: string;
  companyId?: string;
  date?: string;
}

export interface UpdateTokenStatusRequest {
  tokenId: string;
  status: OpdTokenStatusValue;
  reason?: string | null;
  notes?: string | null;
}

export interface ReassignTokenRequest {
  tokenId: string;
  newDoctorUserId: string;
  newDepartmentId?: string | null;
  reason?: string | null;
}
