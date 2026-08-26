import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

const deleteProviderAvailability = async ({
  providerId,
  id,
}: {
  providerId: string;
  id: string;
}) => {
  const response = await fetch(`/api/meditrack/providers/${providerId}/availability/${id}`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 204) {
    const result = await response.json().catch(() => ({}));
    throw new Error(getMessageFromErrorBody(result, "Failed to delete availability session"));
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const useDeleteProviderAvailability = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProviderAvailability,
    retry: false,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["meditrack-provider-availability", variables.providerId],
      });
    },
  });
};
