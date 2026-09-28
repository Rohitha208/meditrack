import { useQuery } from "@tanstack/react-query";
import { isGuid } from "@/queries/meditrack/opd-diagnostics";
import { ADMISSION_REFERRAL_BASE, readJson } from "./client";
import { normalizeAdmissionReferralStatus, type AdmissionReferralStatus } from "./types";

const getAdmissionReferralByVisit = async (visitId: string): Promise<AdmissionReferralStatus | null> => {
  const response = await fetch(`${ADMISSION_REFERRAL_BASE}/visit/${visitId}`);
  if (response.status === 204) return null;
  const data = await readJson<unknown>(response, "Failed to load admission referral");
  return normalizeAdmissionReferralStatus(data);
};

export const admissionReferralByVisitKey = (visitId: string) => [
  "meditrack",
  "opd-admission-referral",
  "visit",
  visitId,
];

export const useGetAdmissionReferralByVisit = (visitId?: string | null, enabled = true) =>
  useQuery({
    queryKey: admissionReferralByVisitKey(visitId || ""),
    queryFn: () => getAdmissionReferralByVisit(visitId as string),
    enabled: enabled && isGuid(visitId),
    retry: false,
    refetchInterval: (query) => {
      const status = String(query.state.data?.status || "").toLowerCase();
      return status === "pending" || status === "processing" ? 15_000 : false;
    },
  });
