import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ADMISSION_REFERRAL_BASE, readJson } from "./client";
import { admissionReferralByVisitKey } from "./get-admission-referral-by-visit";
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
    onSuccess: (_created, variables) => {
      void queryClient.invalidateQueries({ queryKey: admissionReferralByVisitKey(variables.visitId) });
    },
  });
};
