import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { OpdAppointment, RescheduleOpdAppointmentRequest } from "./types";

const rescheduleAppointment = async (
  id: string,
  data: RescheduleOpdAppointmentRequest
): Promise<OpdAppointment> => {
  const response = await fetch(`/api/meditrack/opd/booking/appointments/${id}/reschedule`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to reschedule appointment"));
  }
  return result as OpdAppointment;
};

export const useRescheduleOpdAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: RescheduleOpdAppointmentRequest & { id: string }) =>
      rescheduleAppointment(id, data),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opd-booking-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["opd-bookable-slots"] });
    },
  });
};
