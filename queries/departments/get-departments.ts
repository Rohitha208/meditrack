import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

export interface DepartmentProvider {
  id: string;
  name: string;
  role?: string | null;
}

export interface Department {
  departmentId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  companyId?: string | null;
  clinicId?: string | null;
  headUserId?: string | null;
  headUserName?: string | null;
  tariffGroupId?: string | null;
  doctorCount?: number;
  doctors?: DepartmentProvider[] | null;
  /** @deprecated use doctorCount */
  providerCount?: number;
  /** @deprecated use doctors */
  providers?: DepartmentProvider[] | null;
  bedIds?: string[];
}

export function normalizeDepartment(raw: Record<string, unknown>): Department {
  const doctors = (Array.isArray(raw.doctors) ? raw.doctors : Array.isArray(raw.providers) ? raw.providers : []) as DepartmentProvider[];
  const doctorCount = Number(raw.doctorCount ?? raw.providerCount ?? doctors.length);
  return {
    departmentId: String(raw.departmentId ?? raw.id ?? ""),
    name: String(raw.name ?? ""),
    description: (raw.description as string | null | undefined) ?? null,
    isActive: raw.isActive !== false,
    companyId: (raw.companyId as string | null | undefined) ?? null,
    clinicId: (raw.clinicId as string | null | undefined) ?? null,
    headUserId: (raw.headUserId as string | null | undefined) ?? null,
    headUserName: (raw.headUserName as string | null | undefined) ?? null,
    tariffGroupId: (raw.tariffGroupId as string | null | undefined) ?? null,
    doctorCount,
    doctors,
    providerCount: doctorCount,
    providers: doctors,
    bedIds: Array.isArray(raw.bedIds) ? (raw.bedIds as string[]) : undefined,
  };
}

export function normalizeDepartments(payload: unknown): Department[] {
  if (Array.isArray(payload)) return payload.map((item) => normalizeDepartment(item as Record<string, unknown>));
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data.map((item) => normalizeDepartment(item as Record<string, unknown>));
    if (Array.isArray(obj.items)) return obj.items.map((item) => normalizeDepartment(item as Record<string, unknown>));
  }
  return [];
}

const getDepartments = async (companyId?: string, clinicId?: string): Promise<Department[]> => {
  const params = new URLSearchParams();
  if (companyId) params.set("companyId", companyId);
  if (clinicId) params.set("clinicId", clinicId);

  const qs = params.toString();
  const response = await fetch(`/api/meditrack/department${qs ? `?${qs}` : ""}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch departments"));
  }
  return normalizeDepartments(result);
};

export const useGetDepartments = (companyId?: string, clinicId?: string, enabled = true) => {
  return useQuery({
    queryKey: ["departments", companyId || "", clinicId || ""],
    queryFn: () => getDepartments(companyId, clinicId),
    enabled,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });
};
