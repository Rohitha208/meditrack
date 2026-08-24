import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { Bed } from "./types";

export interface CreateBedRequest {
  wardId: string;
  bedNumber: string;
  status?: string;
  patientId?: string | null;
  isActive?: boolean;
}

const createBed = async (data: CreateBedRequest): Promise<Bed> => {
  const response = await fetch("/api/meditrack/bed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to create bed"));
  }
  return result as Bed;
};

export const useCreateBed = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBed,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      queryClient.invalidateQueries({ queryKey: ["meditrack-wards"] });
    },
  });
};
