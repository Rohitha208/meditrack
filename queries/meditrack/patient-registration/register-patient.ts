import { useMutation } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import {
  RegistrationConflictError,
  type CreatePatientRegistrationRequest,
  type DuplicatePatientCandidate,
  type RegisteredPatient,
  type UpdatePatientRegistrationRequest,
} from "./types";

function throwIfConflict(status: number, result: any, fallback: string): never {
  if (status === 409) {
    const candidates = (result?.candidates || result?.Candidates || []) as DuplicatePatientCandidate[];
    throw new RegistrationConflictError(
      result?.message || result?.Message || "Potential duplicate patient(s) found.",
      Array.isArray(candidates) ? candidates : []
    );
  }
  throw new Error(getMessageFromErrorBody(result, fallback));
}

const createPatient = async (data: CreatePatientRegistrationRequest): Promise<RegisteredPatient> => {
  const response = await fetch("/api/meditrack/patients/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throwIfConflict(response.status, result, "Failed to register patient");
  return result as RegisteredPatient;
};

const updatePatient = async (data: UpdatePatientRegistrationRequest): Promise<RegisteredPatient> => {
  const response = await fetch("/api/meditrack/patients/register", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throwIfConflict(response.status, result, "Failed to update patient");
  return result as RegisteredPatient;
};

export const useCreatePatientRegistration = () =>
  useMutation({
    mutationFn: createPatient,
    retry: false,
  });

export const useUpdatePatientRegistration = () =>
  useMutation({
    mutationFn: updatePatient,
    retry: false,
  });
