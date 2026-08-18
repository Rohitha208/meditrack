import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { normalizeBeds, type Bed } from "./types";

const getBedsByDepartment = async (departmentId: string): Promise<Bed[]> => {
  const response = await fetch(`/api/meditrack/bed/department/${departmentId}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch department beds"));
  }
  return normalizeBeds(result);
};

export const useGetBedsByDepartment = (departmentId?: string, enabled = true) => {
  return useQuery({
    queryKey: ["beds", "department", departmentId || ""],
    queryFn: () => getBedsByDepartment(departmentId as string),
    enabled: !!departmentId && enabled,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};
