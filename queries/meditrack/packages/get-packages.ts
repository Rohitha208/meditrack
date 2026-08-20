import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { normalizePaginated, type MediTrackPackage, type PaginatedList } from "../tariffs/types";

export interface GetPackagesParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  includeInactive?: boolean;
}

const getPackages = async (params: GetPackagesParams = {}): Promise<PaginatedList<MediTrackPackage>> => {
  const query = new URLSearchParams({
    pageNumber: String(params.pageNumber ?? 1),
    pageSize: String(params.pageSize ?? 100),
  });
  if (params.search) query.set("search", params.search);
  if (params.includeInactive) query.set("includeInactive", "true");

  const response = await fetch(`/api/meditrack/package?${query.toString()}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch packages"));
  }
  return normalizePaginated<MediTrackPackage>(result);
};

export const useGetPackages = (params: GetPackagesParams = {}, enabled = true) => {
  return useQuery({
    queryKey: ["meditrack-packages", params.pageNumber ?? 1, params.pageSize ?? 100, params.search || "", params.includeInactive ?? false],
    queryFn: () => getPackages(params),
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};
