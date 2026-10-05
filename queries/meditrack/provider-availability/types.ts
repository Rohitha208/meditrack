export interface ProviderAvailability {
  id: string;
  providerId: string;
  providerName?: string | null;
  clinicId?: string | null;
  roomId?: string | null;
  roomName?: string | null;
  roomType?: string | null;
  floor?: string | null;
  dayOfWeek: string;
  specificDate?: string | null;
  startTime: string;
  endTime: string;
  sessionType: string;
  slotDurationMinutes: number;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateProviderAvailabilityRequest {
  providerId: string;
  clinicId?: string | null;
  dates: string[];
  startTime: string;
  endTime: string;
  sessionType: string;
  roomId: string;
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

/** Normalize typed or picked time to HH:MM, or null if invalid. */
export function normalizeTimeInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    return null;
  }

  match = trimmed.match(/^(\d{1,2})[.:](\d{2})$/);
  if (match) {
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    return null;
  }

  if (/^\d{3,4}$/.test(trimmed)) {
    const h = Number(trimmed.slice(0, -2));
    const m = Number(trimmed.slice(-2));
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }

  return null;
}

export function isValidTimeInput(value: string): boolean {
  return normalizeTimeInput(value) !== null;
}

export function timeToMinutes(value: string): number | null {
  const normalized = normalizeTimeInput(value);
  if (!normalized) return null;
  const [h, m] = normalized.split(":").map(Number);
  return h * 60 + m;
}

export function timeToApi(value: string): string {
  const normalized = normalizeTimeInput(value);
  if (normalized) return `${normalized}:00`;
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

export function formatSessionDate(specificDate?: string | null, dayOfWeek?: string | null): string {
  if (specificDate) {
    const date = new Date(specificDate);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    return specificDate.slice(0, 10);
  }
  if (dayOfWeek) {
    return DAY_FULL_TO_SHORT[dayOfWeek] || dayOfWeek.slice(0, 3);
  }
  return "—";
}

export function datesToApi(dates: Date[]): string[] {
  return dates.map((d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}T00:00:00`;
  });
}
