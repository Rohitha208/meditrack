export interface ConsultationVital {
  id?: string;
  bloodPressure?: string | null;
  heartRateBpm?: number | null;
  temperatureC?: number | null;
  spo2?: number | null;
  weightKg?: number | null;
  chiefComplaint?: string | null;
  isEmergencyEscalation?: boolean;
}

export interface ConsultationPastRecord {
  id: string;
  visitDate: string;
  doctorName?: string | null;
  chiefComplaint?: string | null;
  diagnosis?: string | null;
  outcome?: string | null;
}

export interface ConsultationAssignedLabTest {
  id: string;
  testName: string;
  testType?: string | null;
  status?: string | null;
  orderedDate?: string | null;
}

export interface ConsultationContext {
  appointmentId: string;
  patientId?: string | null;
  vitals?: ConsultationVital | null;
  pastRecords: ConsultationPastRecord[];
  assignedLabTests: ConsultationAssignedLabTest[];
}

export interface ConsultationAmendment {
  id: string;
  medicalRecordId: string;
  amendmentText: string;
  reason?: string | null;
  amendedBy?: string | null;
  amendedByName?: string | null;
  amendedAt: string;
}

export interface ConsultationNote {
  id: string;
  clinicId?: string | null;
  patientId?: string | null;
  appointmentId?: string | null;
  veterinarianId?: string | null;
  visitDate: string;
  chiefComplaint?: string | null;
  history?: string | null;
  physicalExamFindings?: string | null;
  diagnosis?: string | null;
  treatmentPlan?: string | null;
  followUpInstructions?: string | null;
  signedAt?: string | null;
  signedBy?: string | null;
  doctorName?: string | null;
  outcome?: string | null;
  referredToUserId?: string | null;
  referredToDoctorName?: string | null;
  veterinarian?: { firstName?: string; lastName?: string } | null;
  amendments?: ConsultationAmendment[];
}

export interface CreateConsultationNoteRequest {
  clinicId?: string | null;
  visitId: string;
  veterinarianId?: string | null;
  visitDate: string;
  chiefComplaint?: string | null;
  history?: string | null;
  physicalExamFindings?: string | null;
  diagnosis?: string | null;
  treatmentPlan?: string | null;
  followUpInstructions?: string | null;
  weightKg?: number | null;
  temperatureCelsius?: number | null;
  heartRate?: number | null;
  outcome?: string | null;
  referredToUserId?: string | null;
}

export interface AmendConsultationNoteRequest {
  amendmentText: string;
  reason?: string | null;
  amendedBy: string;
}
