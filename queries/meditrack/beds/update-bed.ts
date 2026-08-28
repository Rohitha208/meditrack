import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { Bed } from "./types";

export interface UpdateBedRequest {
  id: string;
  wardId: string;
  categoryId?: string | null;
  bedNumber: string;
  status: string;
  patientId?: string | null;
  isActive: boolean;
}

const updateBed = async (data: UpdateBedRequest): Promise<Bed> => {
  const response = await fetch(`/api/meditrack/bed/${data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to update bed"));
  }
  return result as Bed;
};

export const useUpdateBed = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateBed,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      queryClient.invalidateQueries({ queryKey: ["meditrack-wards"] });
    },
  });
};
