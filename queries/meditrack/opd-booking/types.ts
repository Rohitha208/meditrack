export interface OpdProviderSummary {
  providerId: string;
  providerName: string;
  email?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  roleValue?: string | null;
  roleName?: string | null;
}

export interface OpdPatientLookup {
  id: string;
  name?: string | null;
  uhid?: string | null;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  age?: number | null;
}

export interface OpdAppointment {
  id: string;
  appointmentReference?: string | null;
  providerId?: string | null;
  providerName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  clinicId?: string | null;
  date: string;
  timeFrom?: string | null;
  timeTo?: string | null;
  patientId?: string | null;
  patientName?: string | null;
  patientPhone?: string | null;
  isNewPatient?: boolean;
  status?: string | null;
  reason?: string | null;
  location?: string | null;
  createdAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  isCancelled?: boolean;
}

export interface BookableSlot {
  providerId: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionType: string;
  location: string;
  status: string;
  appointmentId?: string | null;
  patientId?: string | null;
}

export interface CreateOpdAppointmentRequest {
  providerId: string;
  clinicId: string;
  date: string;
  timeFrom: string;
  timeTo: string;
  patientId?: string | null;
  bookedPatientName?: string | null;
  bookedPatientPhone?: string | null;
  reason?: string | null;
}

export interface RescheduleOpdAppointmentRequest {
  date: string;
  timeFrom: string;
  timeTo: string;
  reason?: string | null;
}

export interface CancelOpdAppointmentRequest {
  reason: string;
}

/** Parse API time ("09:00:00" / "09:00") to minutes from midnight. */
export function timeToMinutes(value?: string | null): number | null {
  if (!value) return null;
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesToTimeApi(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

export function formatSlotLabel(value?: string | null): string {
  const minutes = timeToMinutes(value);
  if (minutes === null) return value || "—";
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatAppointmentDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function toApiDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function buildCalendarDays(count = 10, from = new Date()): Date[] {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/**
 * Expand OPD availability sessions into discrete bookable slots matching
 * backend GuardSlotAsync. Duration must come from backend (no frontend default).
 */
export function expandSessionsToDiscreteSlots(
  sessions: Array<{
    startTime: string;
    endTime: string;
    slotDurationMinutes?: number;
    sessionType?: string;
    location?: string;
    status?: string;
  }>
): Array<{ startTime: string; endTime: string; location: string; status: string }> {
  const slots: Array<{ startTime: string; endTime: string; location: string; status: string }> = [];

  for (const session of sessions) {
    if (session.sessionType && !/^OPD$/i.test(session.sessionType)) continue;
    const start = timeToMinutes(session.startTime);
    const end = timeToMinutes(session.endTime);
    if (start === null || end === null || end <= start) continue;

    const duration = session.slotDurationMinutes;
    if (!duration || duration <= 0) continue;

    // If API already returned a discrete slot (end - start == duration), keep it.
    if (end - start === duration) {
      slots.push({
        startTime: minutesToTimeApi(start),
        endTime: minutesToTimeApi(end),
        location: session.location || "",
        status: session.status || "Available",
      });
      continue;
    }

    for (let t = start; t + duration <= end; t += duration) {
      slots.push({
        startTime: minutesToTimeApi(t),
        endTime: minutesToTimeApi(t + duration),
        location: session.location || "",
        status: "Available",
      });
    }
  }

  return slots.sort((a, b) => (timeToMinutes(a.startTime) ?? 0) - (timeToMinutes(b.startTime) ?? 0));
}
