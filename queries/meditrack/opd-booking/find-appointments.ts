import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { OpdAppointment } from "./types";

export interface FindOpdAppointmentsParams {
  reference?: string;
  phone?: string;
  uhid?: string;
  futureOnly?: boolean;
}

const findAppointments = async (params: FindOpdAppointmentsParams): Promise<OpdAppointment[]> => {
  const query = new URLSearchParams();
  if (params.reference) query.set("reference", params.reference);
  if (params.phone) query.set("phone", params.phone);
  if (params.uhid) query.set("uhid", params.uhid);
  if (params.futureOnly === false) query.set("futureOnly", "false");

  const response = await fetch(`/api/meditrack/opd/booking/appointments?${query}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to find appointments"));
  }
  const items = Array.isArray(result) ? result : [];
  return items.map((item) => {
    const row = item as OpdAppointment & { ClinicId?: string | null };
    return {
      ...row,
      clinicId: row.clinicId || row.ClinicId || null,
    };
  });
};

export const useFindOpdAppointments = (params: FindOpdAppointmentsParams, enabled = true) => {
  const hasQuery = !!(params.reference || params.phone || params.uhid);
  return useQuery({
    queryKey: [
      "opd-booking-appointments",
      params.reference || "",
      params.phone || "",
      params.uhid || "",
      params.futureOnly ?? true,
    ],
    queryFn: () => findAppointments(params),
    enabled: enabled && hasQuery,
    staleTime: 0,
  });
};
