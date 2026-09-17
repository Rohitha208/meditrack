import { useQuery } from "@tanstack/react-query";
import { isGuid } from "@/queries/meditrack/opd-diagnostics";
import type { PharmacyVisitOrder } from "./types";
import { PHARMACY_BASE, asVisitOrder, readJson } from "./client";

const getPharmacyVisitOrder = async (visitId: string): Promise<PharmacyVisitOrder> => {
  const response = await fetch(`${PHARMACY_BASE}/visit/${visitId}`);
  const data = await readJson<PharmacyVisitOrder>(response, "Failed to load pharmacy order");
  return asVisitOrder(data);
};

export const pharmacyVisitOrderKey = (visitId: string) => ["meditrack", "opd-pharmacy-visit", visitId];

export const usePharmacyVisitOrder = (visitId?: string | null, enabled = true) =>
  useQuery({
    queryKey: pharmacyVisitOrderKey(visitId || ""),
    queryFn: () => getPharmacyVisitOrder(visitId as string),
    enabled: enabled && isGuid(visitId),
    retry: false,
  });
