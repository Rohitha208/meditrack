import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { BedCategory } from "./types";

export interface UpdateBedCategoryRequest {
  id: string;
  clinicId?: string | null;
  name: string;
  code?: string | null;
  description?: string | null;
  tariffId?: string | null;
  isActive?: boolean;
}

const updateBedCategory = async (data: UpdateBedCategoryRequest): Promise<BedCategory> => {
  const response = await fetch(`/api/meditrack/bed-category/${data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to update bed category"));
  }
  return result as BedCategory;
};

export const useUpdateBedCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateBedCategory,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-bed-categories"] });
    },
  });
};
