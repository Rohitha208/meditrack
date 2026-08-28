import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

const deleteDoctorLeave = async (id: string) => {
  const response = await fetch(`/api/meditrack/doctor-leave/${id}`, {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 204) {
    const result = await response.json().catch(() => ({}));
    throw new Error(getMessageFromErrorBody(result, "Failed to delete doctor leave"));
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const useDeleteDoctorLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDoctorLeave,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-doctor-leaves"] });
    },
  });
};
