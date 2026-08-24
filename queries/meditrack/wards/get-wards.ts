import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { normalizeWards, type MediTrackWard } from "./types";

const getWards = async (clinicId?: string): Promise<MediTrackWard[]> => {
  const params = new URLSearchParams();
  if (clinicId) params.set("clinicId", clinicId);
  const qs = params.toString();
  const response = await fetch(`/api/meditrack/ward${qs ? `?${qs}` : ""}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch wards"));
  }
  return normalizeWards(result);
};

export const useGetWards = (clinicId?: string, enabled = true) => {
  return useQuery({
    queryKey: ["meditrack-wards", clinicId || ""],
    queryFn: () => getWards(clinicId),
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};
