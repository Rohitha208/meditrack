import { useQuery } from "@tanstack/react-query";

export interface AppointmentHistoryItem {
  appointmentId: string;
  visitId: string;
  appointmentDate: string;
  appointmentTimeFrom: string;
  appointmentTimeTo: string;
  appointmentType: string;
  status: string;
  reason: string;
  notes: string;
  veterinarianId: string;
  veterinarianName: string;
  clinicId: string;
  clinicName: string;
  roomId: string;
  roomName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientAppointmentHistoryResponse {
  patientId: string;
  patientName: string;
  appointmentHistory: AppointmentHistoryItem[];
}

async function getPatientAppointmentHistory(patientId: string, clinicId?: string): Promise<PatientAppointmentHistoryResponse> {
  if (!patientId) throw new Error("patientId is required");
  
  const params = new URLSearchParams();
  if (clinicId) {
    params.append('clinicId', clinicId);
  }
  
  const url = `/api/patient/appointment-history/${patientId}${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to fetch appointment history");
  }
  return res.json();
}

export function useGetPatientAppointmentHistory(patientId: string, clinicId?: string) {
  return useQuery<PatientAppointmentHistoryResponse>({
    queryKey: ["patientAppointmentHistory", patientId, clinicId],
    queryFn: () => getPatientAppointmentHistory(patientId, clinicId),
    enabled: !!patientId,
  });
}


