import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { CreateOpdAppointmentRequest, OpdAppointment } from "./types";

const bookAppointment = async (data: CreateOpdAppointmentRequest): Promise<OpdAppointment> => {
  const response = await fetch("/api/meditrack/opd/booking/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to book appointment"));
  }
  return result as OpdAppointment;
};

export const useBookOpdAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bookAppointment,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opd-booking-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["opd-bookable-slots"] });
    },
  });
};
