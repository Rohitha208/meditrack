"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs-new"
import { Button } from "@/components/ui/button"
import MedicalHistoryTab from "../MedicalHistoryTab"
import { ArrowRight, CheckCircle, History, Receipt, ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import AppointmentHistoryNavigation from "../AppointmentHistoryNavigation"
import NewAppointment from "../newAppointment"
import { TabCompletionProvider, useTabCompletion, TabId } from "@/context/TabCompletionContext"
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id"
import { useGetVisitById } from "@/queries/visit/get-visit-by-id"
import { useGetPatientAppointmentHistory } from "@/queries/patients/get-patient-appointment-history"
import InvoiceSheet from "../../invoice/InvoiceSheet"

import VaccinationManagerComp from "../vaccination";

// Import types from the new file
import {
  ExtendedVisitDetail,
  PatientInformationProps,
  TabConfig,
  AppointmentTabConfigMap,
} from "../appointmentConfig";

import { appointmentTabConfigMap } from "../appointmentTabConfig";
import SurgeryComponent from "../surgery"
import DewormingComponent from "../deworming"
import VaccinationPlanning from "../vaccination/VaccinationPlanning"
import CertificateManagementWrapper from "../certification"
import { useContentLayout } from "@/hooks/useContentLayout"

// Create a wrapper for the component content
function PatientInformationContent({ patientId, appointmentId, onClose }: PatientInformationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabId>("intake")
  const [showNewAppointment, setShowNewAppointment] = useState(false)
  const [showMedicalHistory, setShowMedicalHistory] = useState(false)
  const [showInvoice, setShowInvoice] = useState(false)
  const [currentAppointmentId, setCurrentAppointmentId] = useState(appointmentId)
  const { clinic, user, userType } = useContentLayout()
  const { isTabCompleted, markTabAsCompleted } = useTabCompletion()

  // Function to handle tab completion from child components
  const handleTabComplete = (tabId: string, completed: boolean) => {
    if (completed) {
      markTabAsCompleted(tabId as TabId);
    }
  };

  const { data: appointment } = useGetAppointmentById(currentAppointmentId)

  const clinicIdForHistory = (userType?.isClinicAdmin || userType?.isVeterinarian) 
    ? (appointment?.clinicId || clinic?.id) 
    : undefined
  const { data: history } = useGetPatientAppointmentHistory(patientId, clinicIdForHistory)

  const filteredAppointmentHistory = useMemo(() => {
  return history?.appointmentHistory.filter(
    (appt) => appt.status === "in_progress" || appt.status === "completed"
  ) || []
}, [history?.appointmentHistory])

  // Hide medical history button when appointment history navigation is visible
  const hideMedicalHistoryButton = filteredAppointmentHistory.length > 0;

  const selectedAppointment = useMemo(() => {
    return history?.appointmentHistory.find(
      (appt) => appt.appointmentId === currentAppointmentId
    );
  }, [history?.appointmentHistory, currentAppointmentId]);

  

  const { data: visitData } = useGetVisitById(
    selectedAppointment?.visitId as string,
    !!selectedAppointment?.visitId
  )

  // Get the current tab configuration based on appointment type
  const currentTabConfig = useMemo(() => {
    // Use selectedItem?.appointmentType or a default if not available
    const type = appointment?.appointmentType?.name || "Consultation";
    return appointmentTabConfigMap[type] || appointmentTabConfigMap.Consultation;
  }, [appointment?.appointmentType?.name]);

  const TabProvider = useMemo(() => {
    const type = appointment?.appointmentType?.name || "Consultation";
    switch (type) {
      case "Consultation": // Consultation uses the global TabCompletionProvider
        return TabCompletionProvider;
      default:
        return TabCompletionProvider; // Default to global
    }
  }, [appointment?.appointmentType?.name]);

  // Keep currentAppointmentId in sync if parent prop changes
  useEffect(() => {
    setCurrentAppointmentId(appointmentId)
  }, [appointmentId])

  // Initialize tab from URL parameter or default to first tab
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as TabId | null;
    if (tabFromUrl && currentTabConfig.some(tab => tab.value === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else if (currentTabConfig.length > 0) {
      const defaultTab = currentTabConfig[0].value;
      setActiveTab(defaultTab);
      // Update URL if no valid tab in URL
      if (!tabFromUrl) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", defaultTab);
        router.replace(`?${params.toString()}`, { scroll: false });
      }
    } else {
      setActiveTab("intake"); // Fallback if no specific config found
    }
  }, [currentAppointmentId, currentTabConfig, searchParams, router]);

  // Update URL when tab changes (only when Visit Summary is already open)
  const handleTabChange = (value: string) => {
    const newTab = value as TabId;
    setActiveTab(newTab);
    // Only update URL if Visit Summary is open (this component is rendered)
    // This prevents tab parameter from being added when Visit Summary is not open
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    params.set("appointmentId", appointmentId); // Ensure appointmentId is also in URL
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Define tab navigation functions
  const navigateToNextTab = () => {
    const tabOrder = currentTabConfig.map((tab: TabConfig) => tab.value);
    const currentIndex = tabOrder.indexOf(activeTab);

    if (currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    }
  };

  // Function to determine if a tab should appear completed/green based on visit data
  const shouldShowTabAsCompleted = (tabId: string) => {
    // First check TabCompletionContext for immediate state
    const contextCompleted = isTabCompleted(tabId as TabId);
    if (contextCompleted) return true;
    
    // Fall back to database state
    if (!visitData) return false;

    // Use type assertion to access all properties
    const visit = visitData as unknown as ExtendedVisitDetail;

    const tab = currentTabConfig.find((t: TabConfig) => t.value === tabId);
    if (tab && visit[tab.isCompletedKey] !== undefined) {
      return visit[tab.isCompletedKey];
    }
    return false;
  };

  // Determine if all required tabs for the current appointment type are completed
  const allTabsCompleted = useMemo(() => {
    const requiredTabs = currentTabConfig.filter(tab => {
      // For now, consider all tabs as required. Adjust if specific tabs are optional.
      return true;
    });
    return requiredTabs.every((tab: TabConfig) => shouldShowTabAsCompleted(tab.value));
  }, [currentTabConfig, shouldShowTabAsCompleted]);

  return (
    <>
      <Sheet open={true} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[80%] lg:!max-w-[80%] flex flex-col overflow-hidden h-full">
          {/* Fixed header - never scrolls */}
          <SheetHeader className="mb-3 mr-10 flex-shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle>Visit Summary</SheetTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMedicalHistory(true)}
                className="flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                Medical History
              </Button>
            </div>
          </SheetHeader>

          {/* Single scrollable area - only this scrolls. min-h-0 is critical to prevent double scrollbar */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Appointment History Toggle */}
            <AppointmentHistoryNavigation
              patientHistory={filteredAppointmentHistory}
              currentAppointmentId={currentAppointmentId}
                onAppointmentSelect={(newAppointmentId) => {
                  setCurrentAppointmentId(newAppointmentId);
                  // Reset to first tab when changing appointments, but preserve URL param if valid
                  if (currentTabConfig.length > 0) {
                    const tabFromUrl = searchParams.get("tab") as TabId | null;
                    const validTab = tabFromUrl && currentTabConfig.some(tab => tab.value === tabFromUrl)
                      ? tabFromUrl
                      : currentTabConfig[0].value;
                    setActiveTab(validTab);
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("tab", validTab);
                    router.replace(`?${params.toString()}`, { scroll: false });
                  }
                }}
                selectedAppointmentType={appointment?.appointmentType?.name}
              />

            {/* For Vaccination appointments with no tabs, render content directly */}
            {(() => {
              if (appointment?.appointmentType?.name === "Vaccination" && currentTabConfig.length === 0) {
                return (
                  <VaccinationPlanning
                    patientId={patientId}
                    appointmentId={currentAppointmentId}
                    species={appointment?.patient?.species || "dog"}
                    onNext={() => { }}
                    onClose={onClose}
                    clinicId={appointment?.clinicId}
                    isReadOnly={appointment?.status === "completed"}
                    embedded={true}
                    hideMedicalHistoryButton={hideMedicalHistoryButton}
                  />
                );
              }
              
              if (appointment?.appointmentType?.name === "Certification") {
                return (
                  <CertificateManagementWrapper
                    appointmentId={currentAppointmentId}
                    patientId={patientId}
                    onClose={onClose}
                    embedded={true}
                  />
                );
              }
              
              return (
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="w-full z-10">
                    {/* Customize each TabsTrigger to show completion status */}
                    {currentTabConfig.map((tab: TabConfig) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className={`flex items-center gap-1 text-lg font-bold ${shouldShowTabAsCompleted(tab.value) ? "text-green-600" : ""}`}
                      >
                        {tab.label}
                        {shouldShowTabAsCompleted(tab.value) && <CheckCircle className="h-3 w-3 text-green-600" />}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {/* Render tabs based on currentTabConfig */}
                  {currentTabConfig.map((tab: TabConfig) => (
                    <TabsContent key={tab.value} value={tab.value}>
                      <TabProvider >
                        <tab.component
                          patientId={patientId}
                          appointmentId={currentAppointmentId}
                          onNext={navigateToNextTab}
                          onClose={onClose}
                          visitData={visitData}
                          allTabsCompleted={allTabsCompleted}
                          appointment={appointment}
                          species={appointment?.patient?.species || ""}
                          onComplete={(completed: boolean) => handleTabComplete(tab.value, completed)}
                        />
                      </TabProvider>
                    </TabsContent>
                  ))}
                </Tabs>
              );
            })()}

            {/* Follow-up footer - fixed at bottom inside scroll area */}
            {activeTab === "plan" && (
              <div className="border-t border-gray-200 p-4 mt-auto flex-shrink-0">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <Button
                    onClick={() => setShowNewAppointment(true)}
                    className="theme-button text-white"
                  >
                    Book Another Appointment
                  </Button>
                  <Button
                    onClick={() => setShowInvoice(true)}
                    className="theme-button text-white"
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    Generate Invoice
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
        <NewAppointment
          isOpen={showNewAppointment}
          onClose={() => setShowNewAppointment(false)}
          patientId={patientId}
        />
        <InvoiceSheet
          isOpen={showInvoice}
          onClose={() => setShowInvoice(false)}
          patientId={patientId}
          appointmentId={currentAppointmentId}
          visitId={visitData?.id}
        />
      </Sheet>

      {/* Medical History Sheet */}
      <Sheet open={showMedicalHistory} onOpenChange={setShowMedicalHistory}>
        <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[50%] lg:!max-w-[50%] overflow-x-hidden overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Medical History</SheetTitle>
          </SheetHeader>
          <MedicalHistoryTab
            patientId={patientId}
            appointmentId={currentAppointmentId}
            onNext={() => setShowMedicalHistory(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}

// Wrap the exported component with the provider
export default function PatientInformation(props: PatientInformationProps) {
  return (
    <TabCompletionProvider>
      <PatientInformationContent {...props} />
    </TabCompletionProvider>
  )
}