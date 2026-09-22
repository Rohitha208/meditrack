import { useQuery } from "@tanstack/react-query";
import { isGuid } from "@/queries/meditrack/opd-diagnostics";
import { VISIT_CLOSURE_BASE, readJson } from "./client";
import { normalizeVisitBalance, type VisitBalance } from "./types";

const getVisitBalance = async (visitId: string): Promise<VisitBalance> => {
  const response = await fetch(`${VISIT_CLOSURE_BASE}/${visitId}/balance`);
  const data = await readJson<unknown>(response, "Failed to load visit balance");
  return normalizeVisitBalance(data);
};

export const visitBalanceKey = (visitId: string) => ["meditrack", "opd-visit-balance", visitId];

export const useGetVisitBalance = (visitId?: string | null, enabled = true) =>
  useQuery({
    queryKey: visitBalanceKey(visitId || ""),
    queryFn: () => getVisitBalance(visitId as string),
    enabled: enabled && isGuid(visitId),
    retry: false,
  });
