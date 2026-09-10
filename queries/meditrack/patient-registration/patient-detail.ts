import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { PatientDetail } from "./types";

const fetchPatientDetail = async (id: string): Promise<PatientDetail> => {
  const response = await fetch(`/api/meditrack/patients/${id}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to load patient"));
  }
  return result as PatientDetail;
};

export const usePatientDetail = (id?: string | null) =>
  useQuery({
    queryKey: ["meditrack", "patient-detail", id],
    queryFn: () => fetchPatientDetail(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
    retry: false,
  });
