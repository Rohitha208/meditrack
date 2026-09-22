export type AdmissionReferralStatusValue = "pending" | "processing" | "admitted" | string;

export interface CreateAdmissionReferralRequest {
  patientId: string;
  medicalRecordId: string;
  admissionReason: string;
}

export interface AdmissionReferral {
  id: string;
  referralCode: string;
  status: AdmissionReferralStatusValue;
  admissionReason: string;
  diagnosisSnapshot?: string | null;
  vitalsSnapshot?: string | null;
  diagnosticsSnapshot?: string | null;
  referringDoctorName?: string | null;
  createdAt: string;
}

export interface AdmissionReferralTimelineStep {
  step: string;
  label: string;
  completed: boolean;
  timestamp?: string | null;
  detail?: string | null;
}

export interface AdmissionReferralStatus {
  id: string;
  referralCode: string;
  status: AdmissionReferralStatusValue;
  timeline: AdmissionReferralTimelineStep[];
  ipdAdmissionId?: string | null;
  bedAssignment?: string | null;
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

export function normalizeAdmissionReferral(raw: unknown): AdmissionReferral {
  const o = asRecord(raw);
  return {
    id: asString(o.id ?? o.Id),
    referralCode: asString(o.referralCode ?? o.ReferralCode),
    status: asString(o.status ?? o.Status) || "pending",
    admissionReason: asString(o.admissionReason ?? o.AdmissionReason),
    diagnosisSnapshot: asNullableString(o.diagnosisSnapshot ?? o.DiagnosisSnapshot),
    vitalsSnapshot: asNullableString(o.vitalsSnapshot ?? o.VitalsSnapshot),
    diagnosticsSnapshot: asNullableString(o.diagnosticsSnapshot ?? o.DiagnosticsSnapshot),
    referringDoctorName: asNullableString(o.referringDoctorName ?? o.ReferringDoctorName),
    createdAt: asString(o.createdAt ?? o.CreatedAt),
  };
}

export function normalizeTimelineStep(raw: unknown): AdmissionReferralTimelineStep {
  const o = asRecord(raw);
  return {
    step: asString(o.step ?? o.Step),
    label: asString(o.label ?? o.Label),
    completed: Boolean(o.completed ?? o.Completed),
    timestamp: asNullableString(o.timestamp ?? o.Timestamp),
    detail: asNullableString(o.detail ?? o.Detail),
  };
}

export function normalizeAdmissionReferralStatus(raw: unknown): AdmissionReferralStatus {
  const o = asRecord(raw);
  const timelineRaw = o.timeline ?? o.Timeline;
  return {
    id: asString(o.id ?? o.Id),
    referralCode: asString(o.referralCode ?? o.ReferralCode),
    status: asString(o.status ?? o.Status) || "pending",
    timeline: Array.isArray(timelineRaw) ? timelineRaw.map(normalizeTimelineStep) : [],
    ipdAdmissionId: asNullableString(o.ipdAdmissionId ?? o.IpdAdmissionId),
    bedAssignment: asNullableString(o.bedAssignment ?? o.BedAssignment),
  };
}
