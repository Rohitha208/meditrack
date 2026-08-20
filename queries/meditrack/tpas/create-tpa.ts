import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { MediTrackTpa } from "./types";

export interface CreateTpaRequest {
  tpaName: string;
  discountPercent?: string | null;
  overrideRates?: string | null;
  effectiveDate?: string | null;
}

const createTpa = async (data: CreateTpaRequest): Promise<MediTrackTpa> => {
  const response = await fetch("/api/meditrack/tpa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to create TPA rate card"));
  }
  return result as MediTrackTpa;
};

export const useCreateTpa = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTpa,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-tpas"] });
    },
  });
};
