import * as z from "zod";

export const newAppointmentSchema = z.object({
  clinicId: z.string().uuid("Please select a clinic"),
  patientId: z.string().uuid("Please select a patient"),
  veterinarianId: z.string().uuid("Please select a veterinarian"),
  roomId: z.string().uuid("Please select a room"),
  appointmentDate: z.date()
    .refine(date => !!date, "Please select an appointment date")
    .refine(date => {
      const today = new Date();
      today.setHours(0,0,0,0);
      return date >= today;
    }, "Appointment date cannot be in the past"),
  slotId: z.string().min(1, "Please select a slot"),
  appointmentTypeId: z.string().min(1, "Please select an appointment type"),
  reason: z.string().min(1, "Please provide a reason for the appointment"),
  status: z.string(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  isRegistered: z.boolean().optional(),
  sendEmail: z.boolean().optional(),
  isVideoCall: z.boolean().optional(),
});

export type NewAppointmentFormValues = z.infer<typeof newAppointmentSchema>;
