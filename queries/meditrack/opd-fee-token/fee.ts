import { useMutation, useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type {
  CollectFeeRequest,
  FeeEstimate,
  FeeEstimateParams,
  OpdFeeCollection,
} from "./types";

const fetchEstimate = async (params: FeeEstimateParams): Promise<FeeEstimate> => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });

  const response = await fetch(`/api/meditrack/opd/fee/estimate?${search}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to load fee estimate"));
  }
  return result as FeeEstimate;
};

export const useFeeEstimate = (params: FeeEstimateParams, enabled = true) =>
  useQuery({
    queryKey: ["meditrack", "opd-fee-estimate", params],
    queryFn: () => fetchEstimate(params),
    enabled: enabled && Boolean(params.appointmentId || params.userId || params.patientId),
    retry: false,
  });

const fetchCollectionByAppointment = async (appointmentId: string): Promise<OpdFeeCollection | null> => {
  const response = await fetch(`/api/meditrack/opd/fee/appointment/${appointmentId}`);
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to load fee collection"));
  }
  return (result as OpdFeeCollection) ?? null;
};

export const useFeeCollectionByAppointment = (appointmentId?: string | null) =>
  useQuery({
    queryKey: ["meditrack", "opd-fee-collection", "appointment", appointmentId],
    queryFn: () => fetchCollectionByAppointment(appointmentId as string),
    enabled: Boolean(appointmentId),
    retry: false,
  });

const collectFee = async (data: CollectFeeRequest): Promise<OpdFeeCollection> => {
  const response = await fetch("/api/meditrack/opd/fee", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to collect fee"));
  }
  return result as OpdFeeCollection;
};

export const useCollectFee = () => useMutation({ mutationFn: collectFee, retry: false });

const waiveFee = async ({ id, waiverReason }: { id: string; waiverReason: string }): Promise<OpdFeeCollection> => {
  const response = await fetch(`/api/meditrack/opd/fee/${id}/waive`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ waiverReason }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to waive fee"));
  }
  return result as OpdFeeCollection;
};

export const useWaiveFee = () => useMutation({ mutationFn: waiveFee, retry: false });

const voidFeeItem = async ({
  id,
  itemId,
  voidReason,
}: {
  id: string;
  itemId: string;
  voidReason: string;
}): Promise<OpdFeeCollection> => {
  const response = await fetch(`/api/meditrack/opd/fee/${id}/items/${itemId}/void`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voidReason }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to void charge"));
  }
  return result as OpdFeeCollection;
};

export const useVoidFeeItem = () => useMutation({ mutationFn: voidFeeItem, retry: false });

const updatePaymentMethod = async ({
  id,
  paymentMethod,
  transactionReference,
}: {
  id: string;
  paymentMethod: string;
  transactionReference?: string | null;
}): Promise<OpdFeeCollection> => {
  const response = await fetch(`/api/meditrack/opd/fee/${id}/payment-method`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentMethod, transactionReference }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to update payment method"));
  }
  return result as OpdFeeCollection;
};

export const useUpdateFeePaymentMethod = () =>
  useMutation({ mutationFn: updatePaymentMethod, retry: false });
