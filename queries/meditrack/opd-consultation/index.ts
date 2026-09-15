import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { isGuid } from "@/queries/meditrack/opd-diagnostics";
import type {
  AmendConsultationNoteRequest,
  ConsultationAmendment,
  ConsultationContext,
  ConsultationNote,
  CreateConsultationNoteRequest,
} from "./types";

export * from "./types";

const BASE = "/api/meditrack/consultation";

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, fallback));
  }
  return result as T;
}

export const consultationContextKey = (visitId: string) => ["meditrack", "opd-consultation-context", visitId];
export const consultationNoteKey = (appointmentId: string) => ["meditrack", "opd-consultation-note", appointmentId];
export const consultationAmendmentsKey = (recordId: string) => ["meditrack", "opd-consultation-amendments", recordId];

const fetchContext = async (visitId: string): Promise<ConsultationContext> => {
  const response = await fetch(`${BASE}/${visitId}`);
  if (response.status === 403 || response.status === 404) {
    return { appointmentId: "", patientId: null, vitals: null, pastRecords: [], assignedLabTests: [] };
  }
  const data = await readJson<ConsultationContext>(response, "Failed to load consultation");
  return {
    appointmentId: data.appointmentId,
    patientId: data.patientId,
    vitals: data.vitals ?? null,
    pastRecords: Array.isArray(data.pastRecords) ? data.pastRecords : [],
    assignedLabTests: Array.isArray(data.assignedLabTests) ? data.assignedLabTests : [],
  };
};

export const useConsultationContext = (visitId?: string | null, enabled = true) =>
  useQuery({
    queryKey: consultationContextKey(visitId || ""),
    queryFn: () => fetchContext(visitId as string),
    enabled: Boolean(visitId) && isGuid(visitId) && enabled,
    retry: false,
  });

const fetchNoteByAppointment = async (appointmentId: string): Promise<ConsultationNote | null> => {
  const params = new URLSearchParams({
    appointmentId,
    pageNumber: "1",
    pageSize: "5",
  });
  const response = await fetch(`${BASE}/records?${params}`);
  if (response.status === 403 || response.status === 404) return null;
  const data = await readJson<{ items?: ConsultationNote[]; Items?: ConsultationNote[] }>(
    response,
    "Failed to load consultation note"
  );
  const items = Array.isArray(data.items) ? data.items : Array.isArray(data.Items) ? data.Items : [];
  return items[0] ?? null;
};

export const useConsultationNote = (appointmentId?: string | null, enabled = true) =>
  useQuery({
    queryKey: consultationNoteKey(appointmentId || ""),
    queryFn: () => fetchNoteByAppointment(appointmentId as string),
    enabled: Boolean(appointmentId) && isGuid(appointmentId) && enabled,
    retry: false,
  });

const fetchAmendments = async (recordId: string): Promise<ConsultationAmendment[]> => {
  const response = await fetch(`${BASE}/${recordId}/amendments`);
  if (response.status === 403 || response.status === 404) return [];
  const data = await readJson<ConsultationAmendment[] | { items?: ConsultationAmendment[] }>(
    response,
    "Failed to load addendums"
  );
  if (Array.isArray(data)) return data;
  return Array.isArray(data.items) ? data.items : [];
};

export const useConsultationAmendments = (recordId?: string | null, enabled = true) =>
  useQuery({
    queryKey: consultationAmendmentsKey(recordId || ""),
    queryFn: () => fetchAmendments(recordId as string),
    enabled: Boolean(recordId) && isGuid(recordId) && enabled,
    retry: false,
  });

export const useCreateConsultationNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateConsultationNoteRequest) => {
      const response = await fetch(BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return readJson<ConsultationNote>(response, "Failed to sign consultation notes");
    },
    retry: false,
    onSuccess: (note, variables) => {
      void queryClient.invalidateQueries({ queryKey: consultationContextKey(variables.visitId) });
      const appointmentId = note.appointmentId || "";
      if (appointmentId) {
        void queryClient.invalidateQueries({ queryKey: consultationNoteKey(appointmentId) });
      }
      void queryClient.invalidateQueries({ queryKey: ["meditrack", "opd-consultation-note"] });
    },
  });
};

export const useAmendConsultationNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: AmendConsultationNoteRequest & { id: string }) => {
      const response = await fetch(`${BASE}/${id}/amend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return readJson<ConsultationAmendment>(response, "Failed to add addendum");
    },
    retry: false,
    onSuccess: (row) => {
      if (row.medicalRecordId) {
        void queryClient.invalidateQueries({ queryKey: consultationAmendmentsKey(row.medicalRecordId) });
      }
      void queryClient.invalidateQueries({ queryKey: ["meditrack", "opd-consultation-context"] });
      void queryClient.invalidateQueries({ queryKey: ["meditrack", "opd-consultation-note"] });
    },
  });
};
