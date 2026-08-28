import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { BedCategory } from "./types";

export interface CreateBedCategoryRequest {
  clinicId?: string | null;
  name: string;
  code?: string | null;
  description?: string | null;
  tariffId?: string | null;
  isActive?: boolean;
}

const createBedCategory = async (data: CreateBedCategoryRequest): Promise<BedCategory> => {
  const response = await fetch("/api/meditrack/bed-category", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to create bed category"));
  }
  return result as BedCategory;
};

export const useCreateBedCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBedCategory,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-bed-categories"] });
    },
  });
};
