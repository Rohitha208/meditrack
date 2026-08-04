import { TabId } from "@/context/TabCompletionContext";

// Extended interface to include all completion fields from the API response
export interface ExtendedVisitDetail {
  isIntakeCompleted?: boolean;
  isComplaintsCompleted?: boolean;
  isVitalsCompleted?: boolean;
  isProceduresCompleted?: boolean;
  isPrescriptionCompleted?: boolean;
  isPlanCompleted?: boolean;
  isSurgeryPreOpCompleted?: boolean;
  isSurgeryDetailsCompleted?: boolean;
  isSurgeryPostOpCompleted?: boolean;
  isSurgeryDischargeCompleted?: boolean;
  isEmergencyTriageCompleted?: boolean;
  isEmergencyVitalCompleted?: boolean;
  isEmergencyProcedureCompleted?: boolean;
  isEmergencyDischargeCompleted?: boolean;
  isDewormingIntakeCompleted?: boolean;
  isDewormingMedicationCompleted?: boolean;
  isDewormingNotesCompleted?: boolean;
  isDewormingCheckoutCompleted?: boolean;
  isVaccinationDetailCompleted?: boolean;
}

export interface PatientInformationProps {
  patientId: string;
  appointmentId: string;
  onClose: () => void;
}

export interface TabConfig {
  value: TabId;
  label: string;
  component: React.ComponentType<any>; 
  isCompletedKey: keyof ExtendedVisitDetail; 
}

export interface AppointmentTabConfigMap {
  [key: string]: TabConfig[];
}
