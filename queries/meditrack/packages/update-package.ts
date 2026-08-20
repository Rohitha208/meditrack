import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { MediTrackPackage } from "../tariffs/types";

export interface UpdatePackageRequest {
  id: string;
  code: string;
  name: string;
  fixedRate?: string | null;
  includedServices?: string | null;
  effectiveDate?: string | null;
  isActive?: boolean;
}

const updatePackage = async (data: UpdatePackageRequest): Promise<MediTrackPackage> => {
  const response = await fetch(`/api/meditrack/package/${data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to update package"));
  }
  return result as MediTrackPackage;
};

export const useUpdatePackage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePackage,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-packages"] });
    },
  });
};
