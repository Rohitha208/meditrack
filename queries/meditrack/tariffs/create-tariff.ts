import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { MediTrackTariff } from "./types";

export interface CreateTariffRequest {
  service: string;
  code?: string | null;
  departmentId?: string | null;
  rate?: string | null;
  gst?: string | null;
  effectiveDate?: string | null;
}

const createTariff = async (data: CreateTariffRequest): Promise<MediTrackTariff> => {
  const response = await fetch("/api/meditrack/tariff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to create tariff"));
  }
  return result as MediTrackTariff;
};

export const useCreateTariff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTariff,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-tariffs"] });
    },
  });
};
