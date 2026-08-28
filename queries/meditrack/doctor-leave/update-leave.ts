import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { DoctorLeave } from "./types";

export interface UpdateDoctorLeaveRequest {
  id: string;
  userId: string;
  roleId?: string | null;
  clinicId?: string | null;
  fromDate: string;
  toDate: string;
  reason?: string | null;
  isActive?: boolean;
}

const updateDoctorLeave = async (data: UpdateDoctorLeaveRequest): Promise<DoctorLeave> => {
  const response = await fetch(`/api/meditrack/doctor-leave/${data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to update doctor leave"));
  }
  return result as DoctorLeave;
};

export const useUpdateDoctorLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateDoctorLeave,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-doctor-leaves"] });
    },
  });
};
