import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { MediTrackTariff } from "./types";

export interface UpdateTariffRequest {
  id: string;
  service: string;
  code?: string | null;
  departmentId?: string | null;
  rate?: string | null;
  gst?: string | null;
  effectiveDate?: string | null;
  isActive?: boolean;
}

const updateTariff = async (data: UpdateTariffRequest): Promise<MediTrackTariff> => {
  const response = await fetch(`/api/meditrack/tariff/${data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to update tariff"));
  }
  return result as MediTrackTariff;
};

export const useUpdateTariff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTariff,
    retry: false,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-tariffs"] });
      queryClient.invalidateQueries({ queryKey: ["meditrack-tariff-rates", variables.id] });
    },
  });
};
