import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { normalizeBeds, type Bed } from "./types";

const getBeds = async (status?: string): Promise<Bed[]> => {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await fetch(`/api/meditrack/bed${qs}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch beds"));
  }
  return normalizeBeds(result);
};

export const useGetBeds = (status?: string, enabled = true) => {
  return useQuery({
    queryKey: ["beds", status || "all"],
    queryFn: () => getBeds(status),
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};
