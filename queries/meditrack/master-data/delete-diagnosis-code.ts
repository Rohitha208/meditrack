import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

const deleteDiagnosisCode = async (id: string) => {
  const response = await fetch(`/api/meditrack/diagnosis-code/${id}`, { method: "DELETE" });
  if (!response.ok && response.status !== 204) {
    const result = await response.json().catch(() => ({}));
    throw new Error(getMessageFromErrorBody(result, "Failed to delete diagnosis code"));
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const useDeleteDiagnosisCode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDiagnosisCode,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-diagnosis-codes"] });
    },
  });
};
