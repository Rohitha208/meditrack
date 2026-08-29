import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { MediTrackClinic } from "./types";

export interface UpdateMediTrackClinicRequest {
  id: string;
  companyId: string;
  name: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  description?: string | null;
  taxId?: string | null;
  licenseNumber?: string | null;
  subscriptionStatus?: string | null;
}

const updateClinic = async (data: UpdateMediTrackClinicRequest): Promise<MediTrackClinic> => {
  const response = await fetch(`/api/meditrack/clinic/${data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to update branch"));
  }
  return result as MediTrackClinic;
};

export const useUpdateMediTrackClinic = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateClinic,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-clinics"] });
    },
  });
};
