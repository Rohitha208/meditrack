import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { DoctorLeave } from "./types";

export interface CreateDoctorLeaveRequest {
  userId: string;
  roleId?: string | null;
  clinicId?: string | null;
  fromDate: string;
  toDate: string;
  reason?: string | null;
}

const createDoctorLeave = async (data: CreateDoctorLeaveRequest): Promise<DoctorLeave> => {
  const response = await fetch("/api/meditrack/doctor-leave", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to create doctor leave"));
  }
  return result as DoctorLeave;
};

export const useCreateDoctorLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDoctorLeave,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-doctor-leaves"] });
    },
  });
};
