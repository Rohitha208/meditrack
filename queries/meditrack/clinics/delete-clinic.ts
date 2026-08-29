import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

const deleteClinic = async (id: string) => {
  const response = await fetch(`/api/meditrack/clinic/${id}`, {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 204) {
    const result = await response.json().catch(() => ({}));
    throw new Error(getMessageFromErrorBody(result, "Failed to delete branch"));
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const useDeleteMediTrackClinic = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteClinic,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-clinics"] });
    },
  });
};
