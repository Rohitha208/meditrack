import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { MediTrackDiagnosisCode } from "./types";

export interface CreateDiagnosisCodeRequest {
  code: string;
  description?: string | null;
  icdVersion?: string;
}

const createDiagnosisCode = async (
  data: CreateDiagnosisCodeRequest
): Promise<MediTrackDiagnosisCode> => {
  const response = await fetch("/api/meditrack/diagnosis-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to create diagnosis code"));
  }
  return result as MediTrackDiagnosisCode;
};

export const useCreateDiagnosisCode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDiagnosisCode,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-diagnosis-codes"] });
    },
  });
};
