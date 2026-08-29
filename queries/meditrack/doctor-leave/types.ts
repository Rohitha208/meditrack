export interface DoctorLeave {
  id: string;
  userId: string;
  doctorName?: string | null;
  roleId?: string | null;
  roleName?: string | null;
  clinicId?: string | null;
  clinicName?: string | null;
  companyId?: string | null;
  fromDate: string;
  toDate: string;
  reason?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export function normalizeDoctorLeaves(payload: unknown): DoctorLeave[] {
  if (Array.isArray(payload)) return payload as DoctorLeave[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as DoctorLeave[];
    if (Array.isArray(obj.items)) return obj.items as DoctorLeave[];
  }
  return [];
}

export function formatLeaveDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    // Already a date-only string like YYYY-MM-DD
    return value.slice(0, 10);
  }
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function toApiDate(value: string) {
  // HTML date input → ISO date at midnight UTC for stable API parsing
  return value.includes("T") ? value : `${value}T00:00:00`;
}
