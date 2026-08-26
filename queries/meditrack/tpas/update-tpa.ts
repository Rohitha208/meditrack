import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { MediTrackTpa } from "./types";

export interface UpdateTpaRequest {
  id: string;
  tpaName: string;
  payerType?: string | null;
  empanelmentStatus?: string | null;
  discountPercent?: string | null;
  overrideRates?: string | null;
  effectiveDate?: string | null;
  isActive?: boolean;
}

const updateTpa = async (data: UpdateTpaRequest): Promise<MediTrackTpa> => {
  const response = await fetch(`/api/meditrack/tpa/${data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to update TPA rate card"));
  }
  return result as MediTrackTpa;
};

export const useUpdateTpa = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTpa,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-tpas"] });
    },
  });
};
