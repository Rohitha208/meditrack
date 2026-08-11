import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { Patient } from "./get-patients";

interface CreatePatientRequest {
  clientId: string;
  name: string;
  species: string;
  breed: string;
  secondaryBreed?: string;
  color: string;
  gender: string;
  isNeutered: boolean;
  dateOfBirth: string;
  // Optional to align with form where weight is not mandatory
  weightKg?: number;
  microchipNumber?: string;
  registrationNumber?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  allergies?: string;
  medicalConditions?: string;
  behavioralNotes?: string;
  isActive: boolean;
  // Included because the form sends companyId and backend expects tenant context
  companyId: string;
}

const createPatient = async (data: CreatePatientRequest): Promise<Patient> => {
  const response = await fetch("/api/patients", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = getMessageFromErrorBody(result, 'Failed to create patient');
    throw new Error(message);
  }
  return result as Patient;
};

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newPatient: CreatePatientRequest) => createPatient(newPatient),
    retry: false,
    onSuccess: () => {
      // Invalidate all patient list/search caches so new patient appears in search
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient"] });
    },
  });
}
