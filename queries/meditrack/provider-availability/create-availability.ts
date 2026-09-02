import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { CreateProviderAvailabilityRequest, ProviderAvailability } from "./types";

const createProviderAvailability = async (
  data: CreateProviderAvailabilityRequest
): Promise<ProviderAvailability[]> => {
  const response = await fetch(`/api/meditrack/providers/${data.providerId}/availability`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to create availability session"));
  }
  return Array.isArray(result) ? result : result ? [result as ProviderAvailability] : [];
};

export const useCreateProviderAvailability = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProviderAvailability,
    retry: false,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["meditrack-provider-availability", variables.providerId],
      });
    },
  });
};
