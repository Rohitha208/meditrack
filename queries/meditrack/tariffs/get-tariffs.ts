import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { normalizePaginated, type MediTrackTariff, type PaginatedList } from "./types";

export interface GetTariffsParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  departmentId?: string;
  includeInactive?: boolean;
}

const getTariffs = async (params: GetTariffsParams = {}): Promise<PaginatedList<MediTrackTariff>> => {
  const query = new URLSearchParams({
    pageNumber: String(params.pageNumber ?? 1),
    pageSize: String(params.pageSize ?? 100),
  });
  if (params.search) query.set("search", params.search);
  if (params.departmentId) query.set("departmentId", params.departmentId);
  if (params.includeInactive) query.set("includeInactive", "true");

  const response = await fetch(`/api/meditrack/tariff?${query.toString()}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch tariffs"));
  }
  return normalizePaginated<MediTrackTariff>(result);
};

export const useGetTariffs = (params: GetTariffsParams = {}, enabled = true) => {
  return useQuery({
    queryKey: ["meditrack-tariffs", params.pageNumber ?? 1, params.pageSize ?? 100, params.search || "", params.departmentId || "", params.includeInactive ?? false],
    queryFn: () => getTariffs(params),
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};
