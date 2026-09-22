import { useMutation, useQueryClient } from "@tanstack/react-query";
import { VISIT_CLOSURE_BASE, readJson } from "./client";
import { visitClosureKey } from "./get-closure-status";
import { visitBalanceKey } from "./get-visit-balance";
import type { ReopenVisitRequest } from "./types";

const reopenVisit = async ({ visitId, reason }: ReopenVisitRequest): Promise<unknown> => {
  const response = await fetch(`${VISIT_CLOSURE_BASE}/${visitId}/reopen`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  return readJson<unknown>(response, "Failed to reopen visit");
};

export const useReopenVisit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reopenVisit,
    retry: false,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: visitClosureKey(variables.visitId) });
      void queryClient.invalidateQueries({ queryKey: visitBalanceKey(variables.visitId) });
    },
  });
};
