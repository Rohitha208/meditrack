"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import VaccinationPlanning from "./VaccinationPlanning"
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { appointmentTabConfigMap } from "../appointmentTabConfig"
import DewormingComponent from "../deworming"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs-new";
import { Button } from "@/components/ui/button";
import { CheckCircle, History } from "lucide-react";
import { TabCompletionProvider, TabId, useTabCompletion } from "@/context/TabCompletionContext";
import { useGetPatientAppointmentHistory } from "@/queries/patients/get-patient-appointment-history";
import AppointmentHistoryNavigation from "../AppointmentHistoryNavigation"
import MedicalHistoryTab from "../MedicalHistoryTab"
import CertificateManagementWrapper from "../certification";
import { useContentLayout } from "@/hooks/useContentLayout"

interface VaccinationManagerProps {
  patientId: string
  appointmentId: string
  onClose: () => void
  appointmentStatus?: string
  onCompleteAndClose?: () => void
  embedded?: boolean
  hideMedicalHistoryButton?: boolean
}

function VaccinationManager({
  patientId,
  appointmentId,
  onClose,
  appointmentStatus,
  onCompleteAndClose,
  embedded = false,
  hideMedicalHistoryButton = false
}: VaccinationManagerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSheetOpen, setIsSheetOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("vaccination-planning");
  const [weightGraphOpen, setWeightGraphOpen] = useState(false);
  const [showMedicalHistory, setShowMedicalHistory] = useState(false);
  const [currentAppointmentId, setCurrentAppointmentId] = useState(appointmentId);
  const { clinic, user, userType } = useContentLayout()
  const { data: appointment } = useGetAppointmentById(currentAppointmentId);

  // Use clinic ID for appointment history if user is clinic admin or veterinarian
  const clinicIdForHistory = (user?.roleName === 'Clinic Admin' || user?.roleName === 'Veterinarian') 
    ? (appointment?.clinicId || clinic?.id) 
    : undefined

  const { data: history } = useGetPatientAppointmentHistory(patientId, clinicIdForHistory);
  const { data: visitData, refetch: refetchVisitData } = useGetVisitByAppointmentId(currentAppointmentId);
  const [followUpDateFooter, setFollowUpDateFooter] = useState<string>("");

  // Get patient species from appointment data
  const species = appointment?.patient?.species || "dog"

  // Keep currentAppointmentId in sync if parent prop changes
  useEffect(() => {
    setCurrentAppointmentId(appointmentId);
  }, [appointmentId]);

  // Get tab completion state
  const { isTabCompleted } = useTabCompletion();

  // Get the current tab configuration based on appointment type
  const currentTabConfig = useMemo(() => {
    const type = appointment?.appointmentType?.name || "Vaccination";
    return appointmentTabConfigMap[type] || [];
  }, [appointment?.appointmentType?.name]);

  // Determine the appropriate provider based on appointment type
  const TabProvider = TabCompletionProvider;

  // Initialize tab from URL parameter or default to first tab
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as TabId | null;
    if (tabFromUrl && currentTabConfig.some(tab => tab.value === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else if (currentTabConfig.length > 0 && appointment?.appointmentType?.name) {
      const defaultTab = currentTabConfig[0].value;
      setActiveTab(defaultTab);
      // Update URL if no valid tab in URL
      if (!tabFromUrl) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", defaultTab);
        router.replace(`?${params.toString()}`, { scroll: false });
      }
    }
  }, [currentTabConfig, appointment?.appointmentType?.name, searchParams, router]);

  // Update URL when tab changes (only when Visit Summary is already open)
  const handleTabChange = (value: string) => {
    const newTab = value as TabId;
    setActiveTab(newTab);
    // Only update URL if Visit Summary is open (this component is rendered)
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    params.set("appointmentId", currentAppointmentId); // Ensure appointmentId is also in URL
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const filteredAppointmentHistory = useMemo(() => {
  return history?.appointmentHistory.filter(
    (appt) => appt.status === "in_progress" || appt.status === "completed"
  ) || []
}, [history?.appointmentHistory])

  // Keep currentAppointmentId in sync if parent prop changes
  useEffect(() => {
    setCurrentAppointmentId(appointmentId);
  }, [appointmentId]);

  // When currentAppointmentId changes, refetch visit data
  useEffect(() => {
    refetchVisitData();
  }, [currentAppointmentId, refetchVisitData]);

  const isSurgeryTabCompleted = (tabValue: string): boolean => {
    if (!visitData) return false;

    const visit = visitData as any;
    const tabConfig = currentTabConfig.find(tab => tab.value === tabValue);

    if (!tabConfig || !tabConfig.isCompletedKey) {
      return false;
    }

    const isCompleted = Boolean(visit[tabConfig.isCompletedKey]);
    return isCompleted;
  };
  const navigateToNextTab = () => {
    if (!currentTabConfig) return;
    const currentIndex = currentTabConfig.findIndex(tab => tab.value === activeTab);
    if (currentIndex < currentTabConfig.length - 1) {
      setActiveTab(currentTabConfig[currentIndex + 1].value);
    }
  };

  const handleClose = () => {
    setIsSheetOpen(false);
    if (onCompleteAndClose) {
      onCompleteAndClose();
    } else {
      onClose();
    }
  };

  return (
    <>
      <Sheet open={true} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[70%] lg:!max-w-[70%] overflow-x-hidden overflow-y-auto">
          <SheetHeader className="mb-6 mr-10">
            <div className="flex items-center justify-between">
              <SheetTitle>Vaccination Management</SheetTitle>
              <div className="flex items-center gap-2">
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
            </div>
          </SheetHeader>

          {/* Show loading state while data is being fetched */}
          {!appointment ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Appointment History Navigation */}
              {filteredAppointmentHistory.length > 0 && (
                <div className="mb-4">
                  <AppointmentHistoryNavigation
                    patientHistory={filteredAppointmentHistory}
                    currentAppointmentId={currentAppointmentId}
                    onAppointmentSelect={(newAppointmentId) => {
                      setCurrentAppointmentId(newAppointmentId);
                      // Reset to first tab when changing appointments, but preserve URL param if valid
                      if (currentTabConfig && currentTabConfig.length > 0) {
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
                    selectedAppointmentType="Vaccination"
                  />
                </div>
              )}

              {/* Conditionally render tabs or VaccinationPlanning */}
              {(() => {
                const appointmentType = appointment?.appointmentType?.name?.toLowerCase();

                if (appointmentType === "vaccination") {
                  return (
                    <VaccinationPlanning
                      patientId={patientId}
                      appointmentId={currentAppointmentId}
                      species={species}
                      clinicId={appointment?.clinicId}
                      onNext={navigateToNextTab}
                      onClose={handleClose}
                      isReadOnly={appointmentStatus === "completed"}
                      embedded={true}
                      hideMedicalHistoryButton={true}
                    />
                  );
                }

                if (appointmentType === "certification" || appointmentType === "certificate") {
                  return (
                    <div className="p-4">
                      <CertificateManagementWrapper
                        appointmentId={currentAppointmentId}
                        patientId={patientId}
                        onClose={onClose}
                        embedded={true}
                      />
                    </div>
                  );
                }

                // Show tabs for other appointment types
                return (
                  <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
                    <TabsList className="w-full">
                      {currentTabConfig.map((tab) => (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className={`flex items-center gap-1 text-lg font-bold ${isSurgeryTabCompleted(tab.value) ? 'data-[state=active]:text-green-600' : ''
                            }`}
                        >
                          <span className="flex items-center gap-1">
                            {tab.label}
                            {isSurgeryTabCompleted(tab.value) && (
                              <CheckCircle className="h-4 w-4 text-green-600 ml-1" />
                            )}
                          </span>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {currentTabConfig?.map((tab: any) => {
                      const TabComponent = tab.component;
                      return (
                        <TabsContent key={tab.value} value={tab.value}>
                          <TabProvider>
                            <TabComponent
                              patientId={patientId}
                              appointmentId={currentAppointmentId}
                              visitId={visitData?.id}
                              onNext={navigateToNextTab}
                              onClose={onClose}
                              externalFollowUpDate={followUpDateFooter}
                              onExternalFollowUpDateChange={setFollowUpDateFooter}
                              setWeightGraphOpen={tab.value === "surgery-pre-op" ? setWeightGraphOpen : undefined}
                            />
                          </TabProvider>
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                );
              })()}
            </div>
          )}
        </SheetContent>
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
  );
}

export default function VaccinationManagerComponent(props: VaccinationManagerProps) {
  return (
    <TabCompletionProvider>
      <VaccinationManager {...props} />
    </TabCompletionProvider>
  );
}