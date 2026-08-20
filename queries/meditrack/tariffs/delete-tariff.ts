import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

const deleteTariff = async (id: string) => {
  const response = await fetch(`/api/meditrack/tariff/${id}`, {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 204) {
    const result = await response.json().catch(() => ({}));
    throw new Error(getMessageFromErrorBody(result, "Failed to delete tariff"));
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const useDeleteTariff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTariff,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-tariffs"] });
    },
  });
};
