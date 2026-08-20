import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { MediTrackTariffRateHistory } from "./types";

function normalizeRates(payload: unknown): MediTrackTariffRateHistory[] {
  if (Array.isArray(payload)) return payload as MediTrackTariffRateHistory[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as MediTrackTariffRateHistory[];
    if (Array.isArray(obj.items)) return obj.items as MediTrackTariffRateHistory[];
  }
  return [];
}

const getTariffRates = async (tariffId: string): Promise<MediTrackTariffRateHistory[]> => {
  const response = await fetch(`/api/meditrack/tariff/${tariffId}/rates`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch rate history"));
  }
  return normalizeRates(result);
};

export const useGetTariffRates = (tariffId?: string, enabled = true) => {
  return useQuery({
    queryKey: ["meditrack-tariff-rates", tariffId || ""],
    queryFn: () => getTariffRates(tariffId as string),
    enabled: !!tariffId && enabled,
    staleTime: 0,
  });
};
