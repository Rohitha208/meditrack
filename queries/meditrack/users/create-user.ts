import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { MediTrackUser } from "./get-users";

export interface CreateMediTrackUserRequest {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName?: string | null;
  roleId: string;
  companyId?: string | null;
  departmentId?: string | null;
  specialtyId?: string | null;
  clinicIds?: string[] | null;
  medicalRegistrationNumber?: string | null;
  rate?: number | null;
}

const createUser = async (data: CreateMediTrackUserRequest): Promise<MediTrackUser> => {
  const response = await fetch("/api/meditrack/user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to create user"));
  }
  return result as MediTrackUser;
};

export const useCreateMediTrackUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-users"] });
    },
  });
};
