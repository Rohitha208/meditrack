import { useQuery } from "@tanstack/react-query";
import { isGuid } from "@/queries/meditrack/opd-diagnostics";
import { VISIT_CLOSURE_BASE, readJson } from "./client";
import { normalizeVisitClosureStatus, type VisitClosureStatus } from "./types";

const getVisitClosureStatus = async (visitId: string): Promise<VisitClosureStatus> => {
  const response = await fetch(`${VISIT_CLOSURE_BASE}/${visitId}/closure-status`);
  const data = await readJson<unknown>(response, "Failed to load visit closure status");
  return normalizeVisitClosureStatus(data);
};

export const visitClosureKey = (visitId: string) => ["meditrack", "opd-visit-closure", visitId];

export const useGetVisitClosureStatus = (visitId?: string | null, enabled = true) =>
  useQuery({
    queryKey: visitClosureKey(visitId || ""),
    queryFn: () => getVisitClosureStatus(visitId as string),
    enabled: enabled && isGuid(visitId),
    retry: false,
  });
