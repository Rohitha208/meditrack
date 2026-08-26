export interface ProviderAvailability {
  id: string;
  providerId: string;
  providerName?: string | null;
  clinicId?: string | null;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  sessionType: string;
  location: string;
  slotDurationMinutes: number;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateProviderAvailabilityRequest {
  providerId: string;
  clinicId?: string | null;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  sessionType: string;
  location: string;
  slotDurationMinutes?: number;
}

/** UI short day → API full day name (Monday…Sunday). */
export const DAY_SHORT_TO_FULL: Record<string, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

export const DAY_FULL_TO_SHORT: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

export function formatTimeForUi(value?: string | null): string {
  if (!value) return "—";
  // Handles "09:00:00", "09:00", "09:00:00.0000000"
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return String(value);
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

export function timeToApi(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "09:00:00";
  if (/^\d{1,2}:\d{2}:\d{2}/.test(trimmed)) return trimmed;
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  return trimmed;
}

export function sessionTypeToApi(type: string): string {
  if (type === "Ward Round" || type === "WARD_ROUND") return "WARD_ROUND";
  if (type === "On Call" || type === "ON_CALL") return "ON_CALL";
  return "OPD";
}

export function sessionTypeToUi(type?: string | null): "OPD" | "Ward Round" {
  if (!type) return "OPD";
  const normalized = type.toUpperCase().replace(/[\s-]/g, "_");
  if (normalized === "WARD_ROUND" || normalized === "WARDROUND") return "Ward Round";
  return "OPD";
}
