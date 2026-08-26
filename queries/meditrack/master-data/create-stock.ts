import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { MediTrackStock } from "./types";

export interface CreateStockRequest {
  drugName: string;
  batch?: string | null;
  expiry?: string | null;
  quantityOnHand: number;
  status?: string | null;
}

const createStock = async (data: CreateStockRequest): Promise<MediTrackStock> => {
  const response = await fetch("/api/meditrack/stock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to create stock entry"));
  }
  return result as MediTrackStock;
};

export const useCreateStock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStock,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-stock"] });
      queryClient.invalidateQueries({ queryKey: ["meditrack-drugs"] });
    },
  });
};
