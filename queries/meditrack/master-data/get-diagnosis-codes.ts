import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import {
  normalizePaginated,
  type MediTrackDiagnosisCode,
  type MediTrackDiagnosisCodeList,
} from "./types";

export interface GetDiagnosisCodesParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  icdVersion?: string;
  includeInactive?: boolean;
}

const getDiagnosisCodes = async (
  params: GetDiagnosisCodesParams = {}
): Promise<MediTrackDiagnosisCodeList> => {
  const query = new URLSearchParams({
    pageNumber: String(params.pageNumber ?? 1),
    pageSize: String(params.pageSize ?? 100),
  });
  if (params.search) query.set("search", params.search);
  if (params.icdVersion) query.set("icdVersion", params.icdVersion);
  if (params.includeInactive) query.set("includeInactive", "true");

  const response = await fetch(`/api/meditrack/diagnosis-code?${query.toString()}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch diagnosis codes"));
  }
  return normalizePaginated<MediTrackDiagnosisCode>(result);
};

export const useGetDiagnosisCodes = (params: GetDiagnosisCodesParams = {}, enabled = true) => {
  return useQuery({
    queryKey: [
      "meditrack-diagnosis-codes",
      params.pageNumber ?? 1,
      params.pageSize ?? 100,
      params.search || "",
      params.icdVersion || "",
      params.includeInactive ?? false,
    ],
    queryFn: () => getDiagnosisCodes(params),
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};
