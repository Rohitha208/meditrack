import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { normalizeClinics, type MediTrackClinicList } from "./types";

export interface GetClinicsParams {
  pageNumber?: number;
  pageSize?: number;
  companyId?: string;
  search?: string;
}

const getClinics = async (params: GetClinicsParams = {}): Promise<MediTrackClinicList> => {
  const query = new URLSearchParams({
    pageNumber: String(params.pageNumber ?? 1),
    pageSize: String(params.pageSize ?? 100),
    paginationRequired: "true",
  });
  if (params.companyId) query.set("companyId", params.companyId);
  if (params.search) query.set("search", params.search);

  const response = await fetch(`/api/meditrack/clinic?${query.toString()}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch clinics"));
  }
  return normalizeClinics(result);
};

export const useGetMediTrackClinics = (params: GetClinicsParams = {}, enabled = true) => {
  return useQuery({
    queryKey: [
      "meditrack-clinics",
      params.pageNumber ?? 1,
      params.pageSize ?? 100,
      params.companyId || "",
      params.search || "",
    ],
    queryFn: () => getClinics(params),
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};
