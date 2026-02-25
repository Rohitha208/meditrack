import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs-new";
import { Button } from "@/components/ui/button";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { AlertTriangle, CheckCircle, History, Calendar } from "lucide-react";
import AppointmentHistoryNavigation from "@/components/appointments/AppointmentHistoryNavigation";
import { useGetPatientAppointmentHistory } from "@/queries/patients/get-patient-appointment-history";
import { useContentLayout } from "@/hooks/useContentLayout"
import NewAppointment from "../newAppointment";
import MedicalHistoryTab from "../MedicalHistoryTab";
import { useTabCompletion, TabId, TabCompletionProvider } from "@/context/TabCompletionContext";
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId";
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id";
import { appointmentTabConfigMap } from "../appointmentTabConfig";
import DewormingComponent from "../deworming";
import VaccinationPlanning from "../vaccination/VaccinationPlanning";
import CertificateManagementWrapper from "../certification";

interface EmergencyComponentProps {
  patientId: string;
  appointmentId: string;
  onClose: () => void;
  onAppointmentChange?: (newAppointmentId: string) => void;
}

function EmergencyContent({ patientId, appointmentId: initialAppointmentId, onClose, onAppointmentChange }: EmergencyComponentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>("emergency-triage");
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showMedicalHistory, setShowMedicalHistory] = useState(false);
  const [followUpDateFooter, setFollowUpDateFooter] = useState<string>("");
  const [currentAppointmentId, setCurrentAppointmentId] = useState(initialAppointmentId);
  const today = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  const { clinic, user, userType } = useContentLayout()

  const { data: appointment } = useGetAppointmentById(currentAppointmentId);

  const clinicIdForHistory = (user?.roleName === 'Clinic Admin' || user?.roleName === 'Veterinarian')
    ? (appointment?.clinicId || clinic?.id)
    : undefined

  const { data: history } = useGetPatientAppointmentHistory(patientId, clinicIdForHistory);
  const { data: visitData, refetch: refetchVisitData } = useGetVisitByAppointmentId(currentAppointmentId);

  const { isTabCompleted } = useTabCompletion();

  const currentTabConfig = useMemo(() => {
    const type = appointment?.appointmentType?.name || "Emergency";
    return appointmentTabConfigMap[type] || [];
  }, [appointment?.appointmentType?.name]);

  const TabProvider = useMemo(() => {
    const type = appointment?.appointmentType?.name || "Emergency";
    switch (type) {
      case "Dewarming":
        return DewormingComponent;
      case "Emergency":
      default:
        return TabCompletionProvider;
    }
  }, [appointment?.appointmentType?.name]);

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as TabId | null;
    if (tabFromUrl && currentTabConfig.some(tab => tab.value === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else if (currentTabConfig.length > 0 && appointment?.appointmentType?.name) {
      const defaultTab = currentTabConfig[0].value;
      setActiveTab(defaultTab);
      if (!tabFromUrl) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", defaultTab);
        router.replace(`?${params.toString()}`, { scroll: false });
      }
    }
  }, [currentTabConfig, appointment?.appointmentType?.name, searchParams, router]);

  const handleTabChange = (value: string) => {
    const newTab = value as TabId;
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    params.set("appointmentId", currentAppointmentId);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const filteredAppointmentHistory = useMemo(() => {
    return history?.appointmentHistory.filter(
      (appt) => appt.status === "in_progress" || appt.status === "completed"
    ) || []
  }, [history?.appointmentHistory])

  useEffect(() => {
    setCurrentAppointmentId(initialAppointmentId);
  }, [initialAppointmentId]);

  useEffect(() => {
    refetchVisitData();
  }, [currentAppointmentId, refetchVisitData]);

  const isEmergencyTabCompleted = (tabValue: string): boolean => {
    if (!visitData) return false;
    const visit = visitData as any;
    const tabConfig = currentTabConfig.find(tab => tab.value === tabValue);
    if (!tabConfig || !tabConfig.isCompletedKey) return false;
    return Boolean(visit[tabConfig.isCompletedKey]);
  };

  const navigateToNextTab = () => {
    if (!currentTabConfig) return;
    const currentIndex = currentTabConfig.findIndex(tab => tab.value === activeTab);
    if (currentIndex < currentTabConfig.length - 1) {
      setActiveTab(currentTabConfig[currentIndex + 1].value);
    }
  };

  return (
    <>
      <Sheet open={true} onOpenChange={onClose}>
        <SheetContent
          side="right"
          className="w-full sm:!max-w-full md:!max-w-[70%] lg:!max-w-[70%] flex flex-col overflow-hidden h-full"
        >
          {/* Fixed header */}
          <SheetHeader className="mb-3 mr-10 flex-shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Emergency Visit
              </SheetTitle>
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

          {/* Single scrollable content area */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Appointment History Navigation - inside scroll div */}
            {filteredAppointmentHistory.length > 0 && (
              <div className="mb-2">
                <AppointmentHistoryNavigation
                  patientHistory={filteredAppointmentHistory}
                  currentAppointmentId={currentAppointmentId}
                  onAppointmentSelect={(newAppointmentId) => {
                    setCurrentAppointmentId(newAppointmentId);
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
                  selectedAppointmentType="Emergency"
                />
              </div>
            )}

            {(() => {
              const appointmentType = appointment?.appointmentType?.name?.toLowerCase();

              if (appointmentType === "vaccination" && currentTabConfig.length === 0) {
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
                    hideMedicalHistoryButton={true}
                  />
                );
              }

              if (appointmentType === "certification" || appointmentType === "certificate") {
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
                  <TabsList className="w-full">
                    {currentTabConfig?.map((tab: any) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className={`flex items-center gap-1 text-lg font-bold ${
                          isEmergencyTabCompleted(tab.value) ? 'data-[state=active]:text-green-600' : ''
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          {tab.label}
                          {isEmergencyTabCompleted(tab.value) && (
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
                        <TabProvider patientId={patientId} appointmentId={currentAppointmentId} onClose={onClose}>
                          <TabComponent
                            patientId={patientId}
                            appointmentId={currentAppointmentId}
                            onNext={navigateToNextTab}
                            onClose={onClose}
                            externalFollowUpDate={followUpDateFooter}
                            onExternalFollowUpDateChange={setFollowUpDateFooter}
                          />
                        </TabProvider>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              );
            })()}
          </div>
        </SheetContent>

        <NewAppointment
          isOpen={showNewAppointment}
          onClose={() => setShowNewAppointment(false)}
          patientId={patientId}
        />
      </Sheet>

      {/* Medical History Sheet */}
      <Sheet open={showMedicalHistory} onOpenChange={setShowMedicalHistory}>
        <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[50%] lg:!max-w-[50%] overflow-x-hidden overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Medical History</SheetTitle>
          </SheetHeader>
          <TabCompletionProvider>
            <MedicalHistoryTab
              patientId={patientId}
              appointmentId={currentAppointmentId}
              onNext={() => setShowMedicalHistory(false)}
            />
          </TabCompletionProvider>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default function EmergencyComponent(props: EmergencyComponentProps) {
  return (
    <TabCompletionProvider>
      <EmergencyContent {...props} />
    </TabCompletionProvider>
  );
}