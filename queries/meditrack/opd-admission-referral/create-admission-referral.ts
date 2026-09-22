import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ADMISSION_REFERRAL_BASE, readJson } from "./client";
import { admissionReferralStatusKey } from "./get-admission-referral-status";
import { normalizeAdmissionReferral, type AdmissionReferral, type CreateAdmissionReferralRequest } from "./types";

const createAdmissionReferral = async (
  data: CreateAdmissionReferralRequest
): Promise<AdmissionReferral> => {
  const response = await fetch(ADMISSION_REFERRAL_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await readJson<unknown>(response, "Failed to create admission referral");
  return normalizeAdmissionReferral(result);
};

export const useCreateAdmissionReferral = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAdmissionReferral,
    retry: false,
    onSuccess: (created) => {
      if (created.id) {
        void queryClient.invalidateQueries({ queryKey: admissionReferralStatusKey(created.id) });
      }
    },
  });
};
