export type RegistrationMatchType = "none" | "single" | "multiple";

export interface RegistrationSearchResult {
  id: string;
  uhid: string;
  name: string;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  abha?: string | null;
  lastVisitDate?: string | null;
  matchedOn?: string[];
}

export interface RegistrationSearchResponse {
  matchType: RegistrationMatchType;
  results: RegistrationSearchResult[];
}

export interface DuplicatePatientCandidate {
  id: string;
  name: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  uhid?: string | null;
  matchedOn?: string[];
}

export interface CreatePatientRegistrationRequest {
  name: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  abhaNumber?: string | null;
  confirmDuplicate?: boolean;
}

export interface UpdatePatientRegistrationRequest {
  id: string;
  name?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  phone?: string | null;
  abhaNumber?: string | null;
  confirmDuplicate?: boolean;
}

export interface RegisteredPatient {
  id: string;
  name: string;
  registrationNumber?: string | null;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  abhaNumber?: string | null;
  nationalId?: string | null;
}

export interface PatientDetail extends RegisteredPatient {
  email?: string | null;
  bloodGroup?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  abhaDocumentPath?: string | null;
}

export class RegistrationConflictError extends Error {
  candidates: DuplicatePatientCandidate[];

  constructor(message: string, candidates: DuplicatePatientCandidate[]) {
    super(message);
    this.name = "RegistrationConflictError";
    this.candidates = candidates;
  }
}
