import { useMutation, useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { LiveQueue, LiveQueueParams, OpdToken, ReassignTokenRequest, UpdateTokenStatusRequest } from "./types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

function asNullableString(value: unknown): string | null {
  const text = asString(value).trim();
  return text ? text : null;
}

function mapQueueToken(raw: unknown): OpdToken {
  const src = asRecord(raw) || {};
  return {
    id: asString(src.id ?? src.Id),
    companyId: asString(src.companyId ?? src.CompanyId),
    clinicId: asString(src.clinicId ?? src.ClinicId),
    userId: asString(src.userId ?? src.UserId),
    roleId: asNullableString(src.roleId ?? src.RoleId),
    userName: asString(src.userName ?? src.UserName),
    departmentId: asNullableString(src.departmentId ?? src.DepartmentId),
    departmentName: asString(src.departmentName ?? src.DepartmentName),
    patientId: asNullableString(src.patientId ?? src.PatientId),
    patientName: asString(src.patientName ?? src.PatientName),
    appointmentId: asNullableString(src.appointmentId ?? src.AppointmentId),
    tokenNumber: asString(src.tokenNumber ?? src.TokenNumber),
    sequenceNumber: Number(src.sequenceNumber ?? src.SequenceNumber ?? 0),
    visitType: asString(src.visitType ?? src.VisitType) || "Walk-in",
    status: asString(src.status ?? src.Status) || "Waiting",
    tokenDate: asString(src.tokenDate ?? src.TokenDate),
    estimatedWaitMinutes: Number(src.estimatedWaitMinutes ?? src.EstimatedWaitMinutes ?? 0),
    waitTimeLabel: asString(src.waitTimeLabel ?? src.WaitTimeLabel),
    estimatedStartTime: asNullableString(src.estimatedStartTime ?? src.EstimatedStartTime),
    missedReason: asNullableString(src.missedReason ?? src.MissedReason),
    notes: asNullableString(src.notes ?? src.Notes),
    createdAt: asString(src.createdAt ?? src.CreatedAt),
  };
}

function normalizeLiveQueue(payload: unknown): LiveQueue {
  const root = asRecord(payload);
  const src = asRecord(root?.data) || root || {};
  const active = src.activeQueue ?? src.ActiveQueue;
  const missed = src.missedTokens ?? src.MissedTokens;
  const summary = asRecord(src.summary ?? src.Summary) || {};
  return {
    userId: asNullableString(src.userId ?? src.UserId),
    userName: asNullableString(src.userName ?? src.UserName),
    departmentId: asNullableString(src.departmentId ?? src.DepartmentId),
    departmentName: asNullableString(src.departmentName ?? src.DepartmentName),
    queueDate: asString(src.queueDate ?? src.QueueDate),
    doctorDelayMinutes: Number(src.doctorDelayMinutes ?? src.DoctorDelayMinutes ?? summary.doctorDelayMinutes ?? 0),
    statusAlertMessage: asNullableString(src.statusAlertMessage ?? src.StatusAlertMessage),
    activeQueue: Array.isArray(active) ? active.map(mapQueueToken).filter((t) => t.id) : [],
    missedTokens: Array.isArray(missed) ? missed.map(mapQueueToken).filter((t) => t.id) : [],
    summary: {
      totalTokensIssued: Number(summary.totalTokensIssued ?? summary.TotalTokensIssued ?? 0),
      inConsultationCount: Number(summary.inConsultationCount ?? summary.InConsultationCount ?? 0),
      waitingCount: Number(summary.waitingCount ?? summary.WaitingCount ?? 0),
      completedCount: Number(summary.completedCount ?? summary.CompletedCount ?? 0),
      missedCount: Number(summary.missedCount ?? summary.MissedCount ?? 0),
      cancelledCount: Number(summary.cancelledCount ?? summary.CancelledCount ?? 0),
      doctorDelayMinutes: Number(summary.doctorDelayMinutes ?? summary.DoctorDelayMinutes ?? 0),
    },
  };
}

const fetchLiveQueue = async (params: LiveQueueParams): Promise<LiveQueue> => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });

  const response = await fetch(`/api/meditrack/opd/tokens/live-queue?${search}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to load queue"));
  }
  return normalizeLiveQueue(result);
};

export const liveQueueKey = (params: LiveQueueParams) => ["meditrack", "opd-live-queue", params];

export const useLiveQueue = (params: LiveQueueParams, enabled = true) =>
  useQuery({
    queryKey: liveQueueKey(params),
    queryFn: () => fetchLiveQueue(params),
    enabled,
    // The queue moves while the desk watches it.
    refetchInterval: 30_000,
    retry: false,
  });

const updateTokenStatus = async ({ tokenId, status, reason, notes }: UpdateTokenStatusRequest): Promise<OpdToken> => {
  const response = await fetch(`/api/meditrack/opd/tokens/${tokenId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, reason, notes }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to update token"));
  }
  return result as OpdToken;
};

export const useUpdateTokenStatus = () => useMutation({ mutationFn: updateTokenStatus, retry: false });

const reassignToken = async ({
  tokenId,
  newDoctorUserId,
  newDepartmentId,
  reason,
}: ReassignTokenRequest): Promise<OpdToken> => {
  const response = await fetch(`/api/meditrack/opd/tokens/${tokenId}/reassign`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newDoctorUserId, newDepartmentId, reason }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to reassign token"));
  }
  return result as OpdToken;
};

export const useReassignToken = () => useMutation({ mutationFn: reassignToken, retry: false });
