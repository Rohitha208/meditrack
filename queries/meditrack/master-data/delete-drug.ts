import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

const deleteDrug = async (id: string) => {
  const response = await fetch(`/api/meditrack/drug/${id}`, { method: "DELETE" });
  if (!response.ok && response.status !== 204) {
    const result = await response.json().catch(() => ({}));
    throw new Error(getMessageFromErrorBody(result, "Failed to delete drug"));
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const useDeleteDrug = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDrug,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-drugs"] });
    },
  });
};
