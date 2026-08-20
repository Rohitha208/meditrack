import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

const deleteTpa = async (id: string) => {
  const response = await fetch(`/api/meditrack/tpa/${id}`, {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 204) {
    const result = await response.json().catch(() => ({}));
    throw new Error(getMessageFromErrorBody(result, "Failed to delete TPA rate card"));
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const useDeleteTpa = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTpa,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-tpas"] });
    },
  });
};
