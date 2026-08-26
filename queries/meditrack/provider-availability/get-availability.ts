import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { ProviderAvailability } from "./types";

const getProviderAvailability = async (providerId: string): Promise<ProviderAvailability[]> => {
  const response = await fetch(`/api/meditrack/providers/${providerId}/availability`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch provider availability"));
  }
  return Array.isArray(result) ? result : [];
};

export const useGetProviderAvailability = (providerId?: string, enabled = true) => {
  return useQuery({
    queryKey: ["meditrack-provider-availability", providerId || ""],
    queryFn: () => getProviderAvailability(providerId as string),
    enabled: !!providerId && enabled,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};
