import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { MediTrackLabTest } from "./types";

export interface UpdateLabTestRequest {
  id: string;
  name: string;
  code?: string | null;
  category?: string | null;
  rate?: number | null;
  sampleType?: string | null;
  tat?: string | null;
  isActive?: boolean;
}

const updateLabTest = async (data: UpdateLabTestRequest): Promise<MediTrackLabTest> => {
  const response = await fetch(`/api/meditrack/lab-test/${data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to update test"));
  }
  return result as MediTrackLabTest;
};

export const useUpdateLabTest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateLabTest,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-lab-tests"] });
    },
  });
};
