import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

const deletePackage = async (id: string) => {
  const response = await fetch(`/api/meditrack/package/${id}`, {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 204) {
    const result = await response.json().catch(() => ({}));
    throw new Error(getMessageFromErrorBody(result, "Failed to delete package"));
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const useDeletePackage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePackage,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-packages"] });
    },
  });
};
