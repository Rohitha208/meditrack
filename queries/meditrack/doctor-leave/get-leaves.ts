import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { normalizeDoctorLeaves, type DoctorLeave } from "./types";

export interface GetDoctorLeavesParams {
  userId?: string;
  clinicId?: string;
  fromDate?: string;
  toDate?: string;
}

const getDoctorLeaves = async (params: GetDoctorLeavesParams = {}): Promise<DoctorLeave[]> => {
  const query = new URLSearchParams();
  if (params.userId) query.set("userId", params.userId);
  if (params.clinicId) query.set("clinicId", params.clinicId);
  if (params.fromDate) query.set("fromDate", params.fromDate);
  if (params.toDate) query.set("toDate", params.toDate);

  const qs = query.toString();
  const response = await fetch(`/api/meditrack/doctor-leave${qs ? `?${qs}` : ""}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch doctor leaves"));
  }
  return normalizeDoctorLeaves(result);
};

export const useGetDoctorLeaves = (params: GetDoctorLeavesParams = {}, enabled = true) => {
  return useQuery({
    queryKey: [
      "meditrack-doctor-leaves",
      params.userId || "",
      params.clinicId || "",
      params.fromDate || "",
      params.toDate || "",
    ],
    queryFn: () => getDoctorLeaves(params),
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};
