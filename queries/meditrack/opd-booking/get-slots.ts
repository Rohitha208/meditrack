import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { BookableSlot } from "./types";

const getBookableSlots = async (
  providerId: string,
  date: string,
  clinicId?: string
): Promise<BookableSlot[]> => {
  const params = new URLSearchParams({ date });
  if (clinicId) params.set("clinicId", clinicId);

  const response = await fetch(
    `/api/meditrack/providers/${providerId}/availability/slots?${params}`
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch bookable slots"));
  }
  return Array.isArray(result) ? result : [];
};

export const useGetBookableSlots = (
  providerId?: string,
  date?: string,
  clinicId?: string,
  enabled = true
) => {
  return useQuery({
    queryKey: ["opd-bookable-slots", providerId || "", date || "", clinicId || ""],
    queryFn: () => getBookableSlots(providerId as string, date as string, clinicId),
    enabled: !!providerId && !!date && enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
};
