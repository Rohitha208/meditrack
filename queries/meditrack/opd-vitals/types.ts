export interface OpdVitalDetail {
  id: string;
  visitId: string;
  patientId?: string | null;
  temperatureC?: number | null;
  heartRateBpm?: number | null;
  respiratoryRateBpm?: number | null;
  bloodPressure?: string | null;
  spo2?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  bmi?: number | null;
  chiefComplaint?: string | null;
  isEmergencyEscalation: boolean;
  isRetriage: boolean;
  notes?: string | null;
  isCompleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveOpdVitalsRequest {
  visitId: string;
  patientId?: string | null;
  bloodPressure?: string | null;
  heartRateBpm?: number | null;
  temperatureC?: number | null;
  spo2?: number | null;
  weightKg?: number | null;
  chiefComplaint?: string | null;
  notes?: string | null;
  isRetriage?: boolean;
  isCompleted?: boolean;
}
