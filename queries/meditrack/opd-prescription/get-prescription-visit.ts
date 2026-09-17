import { useQuery } from "@tanstack/react-query";
import { isGuid, type PrescriptionView } from "./types";
import { PRESCRIPTION_BASE, asView, readJson } from "./client";

const getPrescriptionVisit = async (visitId: string): Promise<PrescriptionView> => {
  const response = await fetch(`${PRESCRIPTION_BASE}/visit/${visitId}`);
  const data = await readJson<PrescriptionView>(response, "Failed to load prescription");
  return asView(data);
};

export const prescriptionVisitKey = (visitId: string) => ["meditrack", "opd-rx-visit", visitId];

export const usePrescriptionVisit = (visitId?: string | null, enabled = true) =>
  useQuery({
    queryKey: prescriptionVisitKey(visitId || ""),
    queryFn: () => getPrescriptionVisit(visitId as string),
    enabled: enabled && isGuid(visitId),
    retry: false,
  });
