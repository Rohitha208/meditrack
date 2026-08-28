import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

const deleteWard = async (id: string) => {
  const response = await fetch(`/api/meditrack/ward/${id}`, {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 204) {
    const result = await response.json().catch(() => ({}));
    throw new Error(getMessageFromErrorBody(result, "Failed to delete ward"));
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const useDeleteWard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWard,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-wards"] });
      queryClient.invalidateQueries({ queryKey: ["beds"] });
    },
  });
};
