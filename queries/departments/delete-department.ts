import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

const deleteDepartment = async (id: string) => {
  const response = await fetch(`/api/meditrack/department/${id}`, {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 204) {
    const result = await response.json().catch(() => ({}));
    throw new Error(getMessageFromErrorBody(result, "Failed to delete department"));
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
};
