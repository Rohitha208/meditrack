import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { MediTrackPackage } from "../tariffs/types";

export interface CreatePackageRequest {
  code: string;
  name: string;
  fixedRate?: string | null;
  includedServiceIds?: string[];
  effectiveDate?: string | null;
}

const createPackage = async (data: CreatePackageRequest): Promise<MediTrackPackage> => {
  const response = await fetch("/api/meditrack/package", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to create package"));
  }
  return result as MediTrackPackage;
};

export const useCreatePackage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPackage,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-packages"] });
    },
  });
};
