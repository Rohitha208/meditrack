import { useMutation, useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { LiveQueue, LiveQueueParams, OpdToken, ReassignTokenRequest, UpdateTokenStatusRequest } from "./types";

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
  return result as LiveQueue;
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
