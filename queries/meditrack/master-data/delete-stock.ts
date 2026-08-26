import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

const deleteStock = async (id: string) => {
  const response = await fetch(`/api/meditrack/stock/${id}`, { method: "DELETE" });
  if (!response.ok && response.status !== 204) {
    const result = await response.json().catch(() => ({}));
    throw new Error(getMessageFromErrorBody(result, "Failed to delete stock entry"));
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const useDeleteStock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteStock,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-stock"] });
    },
  });
};
