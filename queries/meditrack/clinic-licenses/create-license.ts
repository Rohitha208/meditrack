import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { ClinicLicense } from "./types";

export interface CreateClinicLicenseInput {
  clinicId?: string | null;
  licenseNumber: string;
  licenseName?: string | null;
  issuingAuthority?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  file?: File | null;
}

const createClinicLicense = async (data: CreateClinicLicenseInput): Promise<ClinicLicense> => {
  const formData = new FormData();
  if (data.clinicId) formData.append("ClinicId", data.clinicId);
  formData.append("LicenseNumber", data.licenseNumber);
  if (data.licenseName) formData.append("LicenseName", data.licenseName);
  if (data.issuingAuthority) formData.append("IssuingAuthority", data.issuingAuthority);
  if (data.issueDate) formData.append("IssueDate", data.issueDate);
  if (data.expiryDate) formData.append("ExpiryDate", data.expiryDate);
  if (data.file) formData.append("File", data.file);

  const response = await fetch("/api/meditrack/clinic-license", {
    method: "POST",
    body: formData,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to create license"));
  }
  return result as ClinicLicense;
};

export const useCreateClinicLicense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClinicLicense,
    retry: false,
    onSuccess: (_data, variables) => {
      if (variables.clinicId) {
        queryClient.invalidateQueries({
          queryKey: ["meditrack-clinic-licenses", variables.clinicId],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["meditrack-clinics"] });
      queryClient.invalidateQueries({ queryKey: ["meditrack-clinic"] });
    },
  });
};
