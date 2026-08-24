import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { MediTrackWard } from "./types";

export interface CreateWardRequest {
  companyId?: string | null;
  clinicId?: string | null;
  code?: string | null;
  name: string;
  sanctioned?: number;
  headUserId?: string | null;
  isActive?: boolean;
}

const createWard = async (data: CreateWardRequest): Promise<MediTrackWard> => {
  const response = await fetch("/api/meditrack/ward", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to create ward"));
  }
  return result as MediTrackWard;
};

export const useCreateWard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWard,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-wards"] });
    },
  });
};
