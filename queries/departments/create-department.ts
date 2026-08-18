import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { Department } from "./get-departments";

export interface CreateDepartmentRequest {
  name: string;
  description?: string | null;
  isActive?: boolean;
  companyId: string;
  clinicId?: string | null;
  headUserId?: string | null;
  tariffGroupId?: string | null;
  bedIds?: string[] | null;
}

const createDepartment = async (data: CreateDepartmentRequest): Promise<Department> => {
  const response = await fetch("/api/meditrack/department", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to create department"));
  }
  return result as Department;
};

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDepartment,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["beds"] });
    },
  });
};
