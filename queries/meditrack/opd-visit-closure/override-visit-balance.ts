import { useMutation, useQueryClient } from "@tanstack/react-query";
import { VISIT_CLOSURE_BASE, readJson } from "./client";
import { visitClosureKey } from "./get-closure-status";
import { visitBalanceKey } from "./get-visit-balance";
import {
  normalizeOverrideVisitBalanceResponse,
  type OverrideVisitBalanceRequest,
  type OverrideVisitBalanceResponse,
} from "./types";

const overrideVisitBalance = async ({
  visitId,
  reason,
}: OverrideVisitBalanceRequest): Promise<OverrideVisitBalanceResponse> => {
  const response = await fetch(`${VISIT_CLOSURE_BASE}/${visitId}/balance/override`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  const data = await readJson<unknown>(response, "Failed to override visit balance");
  return normalizeOverrideVisitBalanceResponse(data);
};

export const useOverrideVisitBalance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: overrideVisitBalance,
    retry: false,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(visitBalanceKey(variables.visitId), data.updatedBalance);
      void queryClient.invalidateQueries({ queryKey: visitClosureKey(variables.visitId) });
    },
  });
};
