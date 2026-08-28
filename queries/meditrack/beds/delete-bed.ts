import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

const deleteBed = async (id: string) => {
  const response = await fetch(`/api/meditrack/bed/${id}`, {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 204) {
    const result = await response.json().catch(() => ({}));
    throw new Error(getMessageFromErrorBody(result, "Failed to delete bed"));
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const useDeleteBed = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBed,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      queryClient.invalidateQueries({ queryKey: ["meditrack-wards"] });
    },
  });
};
