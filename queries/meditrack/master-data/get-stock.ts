import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { normalizePaginated, type MediTrackStock, type MediTrackStockList } from "./types";

export interface GetStockParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
}

const getStock = async (params: GetStockParams = {}): Promise<MediTrackStockList> => {
  const query = new URLSearchParams({
    pageNumber: String(params.pageNumber ?? 1),
    pageSize: String(params.pageSize ?? 100),
  });
  if (params.search) query.set("search", params.search);

  const response = await fetch(`/api/meditrack/stock?${query.toString()}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch stock"));
  }
  return normalizePaginated<MediTrackStock>(result);
};

export const useGetStock = (params: GetStockParams = {}, enabled = true) => {
  return useQuery({
    queryKey: ["meditrack-stock", params.pageNumber ?? 1, params.pageSize ?? 100, params.search || ""],
    queryFn: () => getStock(params),
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};
