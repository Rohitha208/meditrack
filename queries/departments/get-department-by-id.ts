import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { Department, normalizeDepartment } from "./get-departments";

const getDepartmentById = async (id: string): Promise<Department> => {
  const response = await fetch(`/api/meditrack/department/${id}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch department"));
  }
  return normalizeDepartment(result as Record<string, unknown>);
};

export const useGetDepartmentById = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ["department", id],
    queryFn: () => getDepartmentById(id),
    enabled: !!id && enabled,
    refetchOnWindowFocus: false,
  });
};
