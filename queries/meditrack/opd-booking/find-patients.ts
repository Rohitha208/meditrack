import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { OpdPatientLookup } from "./types";

const findPatients = async (query: string, limit = 20): Promise<OpdPatientLookup[]> => {
  const params = new URLSearchParams({ query, limit: String(limit) });
  const response = await fetch(`/api/meditrack/opd/booking/patients?${params}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to search patients"));
  }
  return Array.isArray(result) ? result : [];
};

export const useFindOpdPatients = (query: string, enabled = true) => {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["opd-booking-patients", trimmed],
    queryFn: () => findPatients(trimmed),
    enabled: enabled && trimmed.length >= 3,
    staleTime: 30_000,
  });
};
