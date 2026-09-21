import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { MediTrackUser } from "./get-users";

export interface UpdateMediTrackUserRequest {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  roleId: string;
  companyId?: string | null;
  departmentId?: string | null;
  specialtyId?: string | null;
  clinicIds?: string[] | null;
  isActive?: boolean | null;
  passwordHash?: string | null;
  medicalRegistrationNumber?: string | null;
  rate?: number | null;
}

const updateUser = async (data: UpdateMediTrackUserRequest): Promise<MediTrackUser> => {
  const response = await fetch(`/api/user/${data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to update user"));
  }
  return result as MediTrackUser;
};

export const useUpdateMediTrackUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUser,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-users"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};
