import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { Department } from "./get-departments";

export interface UpdateDepartmentRequest {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  companyId?: string | null;
  clinicId?: string | null;
  headUserId?: string | null;
  tariffGroupId?: string | null;
  bedIds?: string[] | null;
}

const updateDepartment = async (data: UpdateDepartmentRequest): Promise<Department> => {
  const response = await fetch(`/api/meditrack/department/${data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to update department"));
  }
  return result as Department;
};

export const useUpdateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateDepartment,
    retry: false,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["department", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["beds"] });
    },
  });
};
