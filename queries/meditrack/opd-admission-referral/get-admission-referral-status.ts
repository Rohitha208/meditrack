import { useQuery } from "@tanstack/react-query";
import { isGuid } from "@/queries/meditrack/opd-diagnostics";
import { ADMISSION_REFERRAL_BASE, readJson } from "./client";
import { normalizeAdmissionReferralStatus, type AdmissionReferralStatus } from "./types";

const getAdmissionReferralStatus = async (id: string): Promise<AdmissionReferralStatus> => {
  const response = await fetch(`${ADMISSION_REFERRAL_BASE}/${id}/status`);
  const data = await readJson<unknown>(response, "Failed to load admission referral status");
  return normalizeAdmissionReferralStatus(data);
};

export const admissionReferralStatusKey = (id: string) => ["meditrack", "opd-admission-referral", id];

export const useGetAdmissionReferralStatus = (id?: string | null, enabled = true) =>
  useQuery({
    queryKey: admissionReferralStatusKey(id || ""),
    queryFn: () => getAdmissionReferralStatus(id as string),
    enabled: enabled && isGuid(id),
    retry: false,
    refetchInterval: (query) => {
      const status = String(query.state.data?.status || "").toLowerCase();
      return status === "pending" || status === "processing" ? 15_000 : false;
    },
  });
