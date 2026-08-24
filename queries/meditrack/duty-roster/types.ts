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
  if (Array.isArray(payload)) return payload as DutyRosterEntry[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as DutyRosterEntry[];
    if (Array.isArray(obj.items)) return obj.items as DutyRosterEntry[];
  }
  return [];
}

/** Monday (local) of the week containing `date`, as yyyy-mm-dd. */
export function getWeekStartIso(date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isShiftType(value: string): value is ShiftType {
  return value === "M" || value === "E" || value === "N" || value === "OFF";
}

export function nextShift(current: ShiftType): ShiftType {
  const cycle: ShiftType[] = ["M", "E", "N", "OFF"];
  return cycle[(cycle.indexOf(current) + 1) % cycle.length];
}
