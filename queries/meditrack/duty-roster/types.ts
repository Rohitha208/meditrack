export type ShiftType = "M" | "E" | "N" | "OFF";

export interface DutyRosterEntry {
  id?: string | null;
  userId: string;
  userName?: string | null;
  clinicId: string;
  shiftDate: string;
  shiftType: ShiftType | string;
}

export function normalizeDutyRoster(payload: unknown): DutyRosterEntry[] {
  const asEntry = (raw: Record<string, unknown>): DutyRosterEntry | null => {
    const userId = String(raw.userId ?? raw.UserId ?? "");
    if (!userId) return null;
    return {
      id: (raw.id ?? raw.Id ?? null) as string | null,
      userId,
      userName: (raw.userName ?? raw.UserName ?? null) as string | null,
      clinicId: String(raw.clinicId ?? raw.ClinicId ?? ""),
      shiftDate: String(raw.shiftDate ?? raw.ShiftDate ?? ""),
      shiftType: String(raw.shiftType ?? raw.ShiftType ?? "OFF"),
    };
  };

  if (Array.isArray(payload)) {
    return payload
      .map((row) => (row && typeof row === "object" ? asEntry(row as Record<string, unknown>) : null))
      .filter((row): row is DutyRosterEntry => !!row);
  }
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return normalizeDutyRoster(obj.data);
    if (Array.isArray(obj.items)) return normalizeDutyRoster(obj.items);
    const single = asEntry(obj);
    if (single) return [single];
  }
  return [];
}

function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday (local) of the week containing `date`, as yyyy-mm-dd. */
export function getWeekStartIso(date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toLocalIsoDate(d);
}

export function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toLocalIsoDate(date);
}

/** Normalize API dates like `2026-08-23T00:00:00` → `2026-08-23`. */
export function toShiftDateKey(value: string): string {
  return String(value).slice(0, 10);
}

export function isShiftType(value: string): value is ShiftType {
  return value === "M" || value === "E" || value === "N" || value === "OFF";
}

/** Click cycle: OFF → M → E → N → OFF */
export function nextShift(current: ShiftType): ShiftType {
  const cycle: ShiftType[] = ["OFF", "M", "E", "N"];
  const idx = cycle.indexOf(current);
  return cycle[(idx < 0 ? 0 : idx + 1) % cycle.length];
}
