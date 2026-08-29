import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { MediTrackClinic } from "./types";

const getClinicById = async (id: string): Promise<MediTrackClinic> => {
  const response = await fetch(`/api/meditrack/clinic/${id}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch branch"));
  }
  return result as MediTrackClinic;
};

export const useGetMediTrackClinicById = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ["meditrack-clinic", id],
    queryFn: () => getClinicById(id),
    enabled: enabled && !!id,
    staleTime: 0,
  });
};
