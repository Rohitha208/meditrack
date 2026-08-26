import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

const deleteLabTest = async (id: string) => {
  const response = await fetch(`/api/meditrack/lab-test/${id}`, { method: "DELETE" });
  if (!response.ok && response.status !== 204) {
    const result = await response.json().catch(() => ({}));
    throw new Error(getMessageFromErrorBody(result, "Failed to delete test"));
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const useDeleteLabTest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLabTest,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-lab-tests"] });
    },
  });
};
