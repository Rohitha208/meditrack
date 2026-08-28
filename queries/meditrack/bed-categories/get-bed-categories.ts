import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { normalizeBedCategories, type BedCategory } from "./types";

export interface GetBedCategoriesParams {
  companyId?: string;
  clinicId?: string;
}

const getBedCategories = async (params: GetBedCategoriesParams = {}): Promise<BedCategory[]> => {
  const query = new URLSearchParams();
  if (params.companyId) query.set("companyId", params.companyId);
  if (params.clinicId) query.set("clinicId", params.clinicId);

  const qs = query.toString();
  const response = await fetch(`/api/meditrack/bed-category${qs ? `?${qs}` : ""}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch bed categories"));
  }
  return normalizeBedCategories(result);
};

export const useGetBedCategories = (params: GetBedCategoriesParams = {}, enabled = true) => {
  return useQuery({
    queryKey: ["meditrack-bed-categories", params.companyId || "", params.clinicId || ""],
    queryFn: () => getBedCategories(params),
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};
