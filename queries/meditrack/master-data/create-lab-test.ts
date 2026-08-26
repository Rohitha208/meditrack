import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { MediTrackLabTest } from "./types";

export interface CreateLabTestRequest {
  name: string;
  code?: string | null;
  sampleType?: string | null;
  tat?: string | null;
}

const createLabTest = async (data: CreateLabTestRequest): Promise<MediTrackLabTest> => {
  const response = await fetch("/api/meditrack/lab-test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to create test"));
  }
  return result as MediTrackLabTest;
};

export const useCreateLabTest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLabTest,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-lab-tests"] });
    },
  });
};
