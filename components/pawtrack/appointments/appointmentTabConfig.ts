import IntakeTab from "./Patient-Information/IntakeTab";
import ComplaintsTab from "./Patient-Information/ComplaintsTab";
import MedicalHistoryTab from "./MedicalHistoryTab";
import VitalsTab from "./Patient-Information/VitalsTab";
import ProcedureTab from "./Patient-Information/ProcedureTab";
import AssessmentTab from "./Patient-Information/PrescriptionTab";
import PlanTab from "./Patient-Information/PlanTab";
import SurgeryPreOpTab from "./surgery/PreOpTab";
import SurgeryDetailsTab from "./surgery/SurgeryTab";
import SurgeryPostOpTab from "./surgery/PostOpTab";
import SurgeryDischargeTab from "./surgery/DischargeTab";
import EmergencyTriageTab from "./emergency/TriageTab";
import EmergencyVitalsTab from "./emergency/EmergencyVitalsTab";
import EmergencyProcedureTab from "./emergency/EmergencyProceduresTab";
import EmergencyDischargeTab from "./emergency/DischargeTab";
import DewormingIntakeTab from "./deworming/IntakeTab";
import DewormingMedicationTab from "./deworming/MedicationTab";
import DewormingNotesTab from "./deworming/NotesTab";
import DewormingCheckoutTab from "./deworming/CheckoutTab";
import VaccinationPlanningTab from "./vaccination/VaccinationPlanning";
import VaccinationRecordTab from "./vaccination/VaccinationRecord";
import { AppointmentTabConfigMap } from "./appointmentConfig";
import VaccinationManager from "./vaccination";

export const appointmentTabConfigMap: AppointmentTabConfigMap = {
  Consultation: [
    {
      value: "intake",
      label: "Intake",
      component: IntakeTab,
      isCompletedKey: "isIntakeCompleted",
    },
    {
      value: "vitals",
      label: "Vitals",
      component: VitalsTab,
      isCompletedKey: "isVitalsCompleted",
    },
    {
      value: "cc-hpi",
      label: "Complaints",
      component: ComplaintsTab,
      isCompletedKey: "isComplaintsCompleted",
    },
    {
      value: "procedure",
      label: "Procedure",
      component: ProcedureTab,
      isCompletedKey: "isProceduresCompleted",
    },
    {
      value: "prescription",
      label: "Prescription",
      component: AssessmentTab,
      isCompletedKey: "isPrescriptionCompleted",
    },
    {
      value: "plan",
      label: "Plan",
      component: PlanTab,
      isCompletedKey: "isPlanCompleted",
    },
  ],
  Surgery: [
    {
      value: "surgery-pre-op",
      label: "Pre-Op",
      component: SurgeryPreOpTab,
      isCompletedKey: "isSurgeryPreOpCompleted",
    },
    {
      value: "surgery-details",
      label: "Details",
      component: SurgeryDetailsTab,
      isCompletedKey: "isSurgeryDetailsCompleted",
    },
    {
      value: "surgery-post-op",
      label: "Post-Op",
      component: SurgeryPostOpTab,
      isCompletedKey: "isSurgeryPostOpCompleted",
    },
    {
      value: "prescription",
      label: "Prescription",
      component: AssessmentTab,
      isCompletedKey: "isPrescriptionCompleted",
    },
    {
      value: "surgery-discharge",
      label: "Discharge",
      component: SurgeryDischargeTab,
      isCompletedKey: "isSurgeryDischargeCompleted",
    },
  ],
  Emergency: [
    {
      value: "emergency-triage",
      label: "Triage",
      component: EmergencyTriageTab,
      isCompletedKey: "isEmergencyTriageCompleted",
    },
    {
      value: "emergency-vitals",
      label: "Emergency Vitals",
      component: EmergencyVitalsTab,
      isCompletedKey: "isEmergencyVitalCompleted",
    },
    {
      value: "emergency-procedure",
      label: "Emergency Procedures",
      component: EmergencyProcedureTab,
      isCompletedKey: "isEmergencyProcedureCompleted",
    },
    {
      value: "prescription",
      label: "Prescription",
      component: AssessmentTab,
      isCompletedKey: "isPrescriptionCompleted",
    },
    {
      value: "emergency-discharge",
      label: "Discharge",
      component: EmergencyDischargeTab,
      isCompletedKey: "isEmergencyDischargeCompleted",
    },
  ],
  Deworming: [
    {
      value: "deworming-intake",
      label: "Intake",
      component: DewormingIntakeTab,
      isCompletedKey: "isDewormingIntakeCompleted",
    },
    {
      value: "deworming-medication",
      label: "Medication",
      component: DewormingMedicationTab,
      isCompletedKey: "isDewormingMedicationCompleted",
    },
    {
      value: "prescription",
      label: "Prescription",
      component: AssessmentTab,
      isCompletedKey: "isPrescriptionCompleted",
    },
    {
      value: "deworming-notes",
      label: "Notes",
      component: DewormingNotesTab,
      isCompletedKey: "isDewormingNotesCompleted",
    },
    {
      value: "deworming-checkout",
      label: "Checkout",
      component: DewormingCheckoutTab,
      isCompletedKey: "isDewormingCheckoutCompleted",
    },
  ],
  Vaccination: [],
  certification: [],
};
