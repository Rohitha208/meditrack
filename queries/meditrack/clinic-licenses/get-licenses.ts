import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { normalizeClinicLicenses, type ClinicLicense } from "./types";

const getClinicLicenses = async (clinicId: string): Promise<ClinicLicense[]> => {
  const response = await fetch(`/api/meditrack/clinic-license/clinic/${clinicId}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch licenses"));
  }
  return normalizeClinicLicenses(result);
};

export const useGetClinicLicenses = (clinicId?: string, enabled = true) => {
  return useQuery({
    queryKey: ["meditrack-clinic-licenses", clinicId || ""],
    queryFn: () => getClinicLicenses(clinicId as string),
    enabled: !!clinicId && enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
};
