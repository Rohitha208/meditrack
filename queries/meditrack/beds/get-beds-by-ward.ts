import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { normalizeBeds, type Bed } from "./types";

const getBedsByWard = async (wardId: string): Promise<Bed[]> => {
  const response = await fetch(`/api/meditrack/bed/ward/${wardId}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch ward beds"));
  }
  return normalizeBeds(result);
};

export const useGetBedsByWard = (wardId?: string, enabled = true) => {
  return useQuery({
    queryKey: ["beds", "ward", wardId || ""],
    queryFn: () => getBedsByWard(wardId as string),
    enabled: !!wardId && enabled,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};
