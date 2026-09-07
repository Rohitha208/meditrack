import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { CancelOpdAppointmentRequest, OpdAppointment } from "./types";

const cancelAppointment = async (
  id: string,
  data: CancelOpdAppointmentRequest
): Promise<OpdAppointment> => {
  const response = await fetch(`/api/meditrack/opd/booking/appointments/${id}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to cancel appointment"));
  }
  return result as OpdAppointment;
};

export const useCancelOpdAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelAppointment(id, { reason }),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opd-booking-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["opd-bookable-slots"] });
    },
  });
};
