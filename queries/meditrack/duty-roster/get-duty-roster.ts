import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { normalizeDutyRoster, type DutyRosterEntry } from "./types";

export interface GetDutyRosterParams {
  clinicId: string;
  weekStart: string;
  companyId?: string;
}

const getDutyRoster = async (params: GetDutyRosterParams): Promise<DutyRosterEntry[]> => {
  const query = new URLSearchParams({
    clinicId: params.clinicId,
    weekStart: params.weekStart,
  });
  if (params.companyId) query.set("companyId", params.companyId);

  const response = await fetch(`/api/meditrack/duty-roster?${query.toString()}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch duty roster"));
  }
  return normalizeDutyRoster(result);
};

export const useGetDutyRoster = (params: GetDutyRosterParams | null, enabled = true) => {
  return useQuery({
    queryKey: [
      "meditrack-duty-roster",
      params?.clinicId || "",
      params?.weekStart || "",
      params?.companyId || "",
    ],
    queryFn: () => getDutyRoster(params as GetDutyRosterParams),
    enabled: !!params?.clinicId && !!params?.weekStart && enabled,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};
