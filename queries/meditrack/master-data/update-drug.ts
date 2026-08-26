import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { MediTrackDrug } from "./types";

export interface UpdateDrugRequest {
  id: string;
  name: string;
  schedule?: string | null;
  unit?: string | null;
  hsnCode?: string | null;
  isActive?: boolean;
}

const updateDrug = async (data: UpdateDrugRequest): Promise<MediTrackDrug> => {
  const response = await fetch(`/api/meditrack/drug/${data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to update drug"));
  }
  return result as MediTrackDrug;
};

export const useUpdateDrug = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateDrug,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-drugs"] });
    },
  });
};
