import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { MediTrackDrug } from "./types";

export interface CreateDrugRequest {
  name: string;
  schedule?: string | null;
  unit?: string | null;
  hsnCode?: string | null;
}

const createDrug = async (data: CreateDrugRequest): Promise<MediTrackDrug> => {
  const response = await fetch("/api/meditrack/drug", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to create drug"));
  }
  return result as MediTrackDrug;
};

export const useCreateDrug = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDrug,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-drugs"] });
    },
  });
};
