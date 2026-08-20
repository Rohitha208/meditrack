import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { normalizePaginated, type MediTrackTpa, type MediTrackTpaList } from "./types";

export interface GetTpasParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  includeInactive?: boolean;
}

const getTpas = async (params: GetTpasParams = {}): Promise<MediTrackTpaList> => {
  const query = new URLSearchParams({
    pageNumber: String(params.pageNumber ?? 1),
    pageSize: String(params.pageSize ?? 100),
  });
  if (params.search) query.set("search", params.search);
  if (params.includeInactive) query.set("includeInactive", "true");

  const response = await fetch(`/api/meditrack/tpa?${query.toString()}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch TPA rate cards"));
  }
  return normalizePaginated<MediTrackTpa>(result);
};

export const useGetTpas = (params: GetTpasParams = {}, enabled = true) => {
  return useQuery({
    queryKey: ["meditrack-tpas", params.pageNumber ?? 1, params.pageSize ?? 100, params.search || "", params.includeInactive ?? false],
    queryFn: () => getTpas(params),
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};
