import { useMutation, useQueryClient } from "@tanstack/react-query";
import { VISIT_CLOSURE_BASE, readJson } from "./client";
import { visitClosureKey } from "./get-closure-status";
import { visitBalanceKey } from "./get-visit-balance";
import { normalizeCloseVisitResponse, type CloseVisitResponse } from "./types";

const closeVisit = async (visitId: string): Promise<CloseVisitResponse> => {
  const response = await fetch(`${VISIT_CLOSURE_BASE}/${visitId}/close`, { method: "POST" });
  const data = await readJson<unknown>(response, "Failed to close visit");
  return normalizeCloseVisitResponse(data);
};

export const useCloseVisit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: closeVisit,
    retry: false,
    onSuccess: (_data, visitId) => {
      void queryClient.invalidateQueries({ queryKey: visitClosureKey(visitId) });
      void queryClient.invalidateQueries({ queryKey: visitBalanceKey(visitId) });
    },
  });
};
