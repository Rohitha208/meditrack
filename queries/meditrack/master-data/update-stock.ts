import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { MediTrackStock } from "./types";

export interface UpdateStockRequest {
  id: string;
  drugName: string;
  batch?: string | null;
  expiry?: string | null;
  quantityOnHand: number;
  status?: string | null;
}

const updateStock = async (data: UpdateStockRequest): Promise<MediTrackStock> => {
  const response = await fetch(`/api/meditrack/stock/${data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to update stock entry"));
  }
  return result as MediTrackStock;
};

export const useUpdateStock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateStock,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-stock"] });
      queryClient.invalidateQueries({ queryKey: ["meditrack-drugs"] });
    },
  });
};
