import { useMutation, useQueryClient } from "@tanstack/react-query";
import { VISIT_CLOSURE_BASE, readJson } from "./client";
import { visitClosureKey } from "./get-closure-status";
import { visitBalanceKey } from "./get-visit-balance";
import {
  normalizeCollectVisitBalanceResponse,
  type CollectVisitBalanceRequest,
  type CollectVisitBalanceResponse,
} from "./types";

const collectVisitBalance = async ({
  visitId,
  paymentMethod,
}: CollectVisitBalanceRequest): Promise<CollectVisitBalanceResponse> => {
  const response = await fetch(`${VISIT_CLOSURE_BASE}/${visitId}/balance/collect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentMethod }),
  });
  const data = await readJson<unknown>(response, "Failed to collect visit balance");
  return normalizeCollectVisitBalanceResponse(data);
};

export const useCollectVisitBalance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: collectVisitBalance,
    retry: false,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(visitBalanceKey(variables.visitId), data.updatedBalance);
      void queryClient.invalidateQueries({ queryKey: visitClosureKey(variables.visitId) });
    },
  });
};
