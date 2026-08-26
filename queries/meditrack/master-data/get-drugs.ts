import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { normalizePaginated, type MediTrackDrug, type MediTrackDrugList } from "./types";

export interface GetDrugsParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  includeInactive?: boolean;
}

const getDrugs = async (params: GetDrugsParams = {}): Promise<MediTrackDrugList> => {
  const query = new URLSearchParams({
    pageNumber: String(params.pageNumber ?? 1),
    pageSize: String(params.pageSize ?? 100),
  });
  if (params.search) query.set("search", params.search);
  if (params.includeInactive) query.set("includeInactive", "true");

  const response = await fetch(`/api/meditrack/drug?${query.toString()}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch drugs"));
  }
  return normalizePaginated<MediTrackDrug>(result);
};

export const useGetDrugs = (params: GetDrugsParams = {}, enabled = true) => {
  return useQuery({
    queryKey: ["meditrack-drugs", params.pageNumber ?? 1, params.pageSize ?? 100, params.search || "", params.includeInactive ?? false],
    queryFn: () => getDrugs(params),
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};
