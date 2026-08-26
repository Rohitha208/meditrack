import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { normalizePaginated, type MediTrackLabTest, type MediTrackLabTestList } from "./types";

export interface GetLabTestsParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  includeInactive?: boolean;
}

const getLabTests = async (params: GetLabTestsParams = {}): Promise<MediTrackLabTestList> => {
  const query = new URLSearchParams({
    pageNumber: String(params.pageNumber ?? 1),
    pageSize: String(params.pageSize ?? 100),
  });
  if (params.search) query.set("search", params.search);
  if (params.includeInactive) query.set("includeInactive", "true");

  const response = await fetch(`/api/meditrack/lab-test?${query.toString()}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch tests"));
  }
  return normalizePaginated<MediTrackLabTest>(result);
};

export const useGetLabTests = (params: GetLabTestsParams = {}, enabled = true) => {
  return useQuery({
    queryKey: ["meditrack-lab-tests", params.pageNumber ?? 1, params.pageSize ?? 100, params.search || "", params.includeInactive ?? false],
    queryFn: () => getLabTests(params),
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};
