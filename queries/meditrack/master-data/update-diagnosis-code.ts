import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { MediTrackDiagnosisCode } from "./types";

export interface UpdateDiagnosisCodeRequest {
  id: string;
  code: string;
  description?: string | null;
  icdVersion?: string;
  isActive?: boolean;
}

const updateDiagnosisCode = async (
  data: UpdateDiagnosisCodeRequest
): Promise<MediTrackDiagnosisCode> => {
  const response = await fetch(`/api/meditrack/diagnosis-code/${data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to update diagnosis code"));
  }
  return result as MediTrackDiagnosisCode;
};

export const useUpdateDiagnosisCode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateDiagnosisCode,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-diagnosis-codes"] });
    },
  });
};
