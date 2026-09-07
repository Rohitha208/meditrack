import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { OpdProviderSummary } from "./types";

const getDepartmentDoctors = async (
  departmentId: string,
  clinicId?: string,
  roleValue?: string
): Promise<OpdProviderSummary[]> => {
  const params = new URLSearchParams({ departmentId });
  if (clinicId) params.set("clinicId", clinicId);
  if (roleValue) params.set("roleValue", roleValue);

  const response = await fetch(`/api/meditrack/opd/booking/doctors?${params}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch doctors"));
  }
  return Array.isArray(result) ? result : [];
};

export const useGetDepartmentDoctors = (
  departmentId?: string,
  clinicId?: string,
  enabled = true
) => {
  return useQuery({
    queryKey: ["opd-booking-doctors", departmentId || "", clinicId || ""],
    queryFn: () => getDepartmentDoctors(departmentId as string, clinicId, "doctor"),
    enabled: !!departmentId && enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
};
