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
  providerCount: number;
  bedIds?: string[];
  providers?: DepartmentProvider[] | null;
}

export function normalizeDepartments(payload: unknown): Department[] {
  if (Array.isArray(payload)) return payload as Department[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as Department[];
    if (Array.isArray(obj.items)) return obj.items as Department[];
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
