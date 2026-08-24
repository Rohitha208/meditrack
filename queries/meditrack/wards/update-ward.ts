import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { MediTrackWard } from "./types";

export interface UpdateWardRequest {
  id: string;
  companyId?: string | null;
  clinicId?: string | null;
  code?: string | null;
  name: string;
  sanctioned?: number;
  headUserId?: string | null;
  isActive?: boolean;
}

const updateWard = async (data: UpdateWardRequest): Promise<MediTrackWard> => {
  const response = await fetch(`/api/meditrack/ward/${data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to update ward"));
  }
  return result as MediTrackWard;
};

export const useUpdateWard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateWard,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-wards"] });
    },
  });
};
